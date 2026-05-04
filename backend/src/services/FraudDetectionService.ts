// PURPOSE: Scores every transaction for fraud risk using rule-based checks 
// SCORE: 0-30 approve, 30-70 require 2FA review, 70-100 reject + auto SAR 

import { pool } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// Types 

// What we need to know about a transacton to score it 

export interface TransactionData{
    userId: string;
    amount: number;
    currency: string;
    recipientId? : string;
    recipientCountry? : string;
    metadata?: Record<string, any>;

}

//Each rule returns one of these
interface FraudRuleResult{
    rule: string;
    score: number;
    reason: string;
    triggered: boolean;
}

//final result after all rules run
export interface FraudCheckResult{
    totalScore: number;
    decision: 'APPROVE' | 'REVIEW' | 'REJECT';
    rules: FraudRuleResult[];
    checkedAt: Date;
    transactionData: TransactionData;
}

// Thresholds
const THRESHOLDS ={
    APPROVE_MAX: 30, // 0-30 = safe
    REVIEW_MAX: 70,  // 31-70 = needs 2FA
    //71 -100 = reject + SAR
}

//The Service

class FraudDetectionService{
    /* Main Method: Run all fraud rules against a transaction called by paymentService before processing any payment */

    async checkTransaction(data: TransactionData): Promise<FraudCheckResult> {
        logger.info('Starting fraud check', {
            userId: data.userId,
            amount: data.amount,
            currency: data.currency
        });

        //Run all rules in parallel
        const ruleResults = await Promise.all([
            this.checkHighAmount(data),
            this.checkVelocitySpike(data),
            this.checkNewAccount(data),
            this.checkAmountSpike(data),    
            this.checkCrossBorder(data),
            this.checkRoundNumber(data),
            this.checkNightTransaction(data),
        ]);

        //Add up all the scores, cap at 100
        const totalScore = Math.min(
            ruleResults.reduce((sum, r) => sum + r.score, 0), 100
        );

        //Decide: approve, review or reject
        let decision: 'APPROVE' | 'REVIEW' |'REJECT';
        if(totalScore <= THRESHOLDS.APPROVE_MAX){
            decision = 'APPROVE';
        }else if(totalScore <= THRESHOLDS.REVIEW_MAX){
            decision = 'REVIEW';
        }else{
            decision = 'REJECT';
        }

        const result: FraudCheckResult ={
            totalScore,
            decision,
            rules: ruleResults,
            checkedAt: new Date(),
            transactionData: data,
        };

        //Save to DB for audit trail (FCA requires this)
        await this.saveFraudCheck(result);

        //cache in redis for quick lookup (1 hour expiry)
        await this.cacheFraudCheck(data.userId, result);

        logger.info('Fraud checck complete', {
            userId: data.userId,
            totalScore,
            decision,
            triggeredRules: ruleResults.filter(r => r.triggered).map(r => r.rule)
        });
        return result;
    }


    //INDIVIDUAL FRAUD RULES

    //RULE 1: High Amount Check
     private async checkHighAmount(data: TransactionData): Promise<FraudRuleResult> {
    const amountGBP = await this.convertToGBP(data.amount, data.currency);

    if (amountGBP > 10000) {
      return {
        rule: 'very_high_amount',
        score: 30,
        reason: `Transaction amount £${amountGBP.toFixed(2)} exceeds £10,000 threshold`,
        triggered: true,
      };
    }

    if (amountGBP > 5000) {
      return {
        rule: 'high_amount',
        score: 20,
        reason: `Transaction amount £${amountGBP.toFixed(2)} exceeds £5,000 threshold`,
        triggered: true,
      };
    }

    return {
      rule: 'high_amount',
      score: 0,
      reason: 'Amount within normal range',
      triggered: false,
    };
  }

  //RULE 2 : velocity spike 
// More than 3 transactions in 10 minutes = +25 points

  private async checkVelocitySpike(data: TransactionData): Promise<FraudRuleResult> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await pool.query(
      `SELECT COUNT(*) as tx_count 
       FROM transactions 
       WHERE user_id = $1 AND created_at > $2`,
      [data.userId, tenMinutesAgo]
    );

    const recentCount = parseInt(result.rows[0].tx_count, 10);

    if (recentCount > 3) {
      return {
        rule: 'velocity_spike',
        score: 25,
        reason: `${recentCount} transactions in last 10 minutes (threshold: 3)`,
        triggered: true,
      };
    }

    return {
      rule: 'velocity_spike',
      score: 0,
      reason: `${recentCount} transactions in last 10 minutes — normal`,
      triggered: false,
    };
  }

  //RULE 3 : New Account Check
//   Account less than 7 days old = +15 points 

  private async checkNewAccount(data: TransactionData): Promise<FraudRuleResult> {
    const result = await pool.query(
      `SELECT created_at FROM users WHERE id = $1`,
      [data.userId]
    );

    if (result.rows.length === 0) {
      return {
        rule: 'new_account',
        score: 15,
        reason: 'User not found — treating as new account',
        triggered: true,
      };
    }

    const accountAge = Date.now() - new Date(result.rows[0].created_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (accountAge < sevenDays) {
      const daysOld = Math.floor(accountAge / (24 * 60 * 60 * 1000));
      return {
        rule: 'new_account',
        score: 15,
        reason: `Account is only ${daysOld} days old (threshold: 7 days)`,
        triggered: true,
      };
    }

    return {
      rule: 'new_account',
      score: 0,
      reason: 'Account age is within safe range',
      triggered: false,
    };
  }

  //Rule 4: Amount Spike
//   Transaction 10x bigger than user's average = +20 points 
  private async checkAmountSpike(data: TransactionData): Promise<FraudRuleResult> {
    const result = await pool.query(
      `SELECT AVG(amount) as avg_amount, COUNT(*) as tx_count
       FROM transactions
       WHERE user_id = $1 AND status = 'completed'`,
      [data.userId]
    );

    const avgAmount = parseFloat(result.rows[0].avg_amount) || 0;
    const txCount = parseInt(result.rows[0].tx_count, 10);

    // Need at least 3 transactions for a meaningful average
    if (txCount < 3) {
      return {
        rule: 'amount_spike',
        score: 0,
        reason: `Not enough history (${txCount} transactions)`,
        triggered: false,
      };
    }

    if (data.amount > avgAmount * 10) {
      return {
        rule: 'amount_spike',
        score: 20,
        reason: `Amount ${data.amount} is ${(data.amount / avgAmount).toFixed(1)}x the average (${avgAmount.toFixed(2)})`,
        triggered: true,
      };
    }

    return {
      rule: 'amount_spike',
      score: 0,
      reason: 'Amount is within normal range compared to history',
      triggered: false,
    };
  }


  // Rule 5 : Cross-Border Check
//   Payment currency differs from user's default = +10 points 
private async checkCrossBorder(data: TransactionData): Promise<FraudRuleResult> {
    const result = await pool.query(
      `SELECT default_currency FROM users WHERE id = $1`,
      [data.userId]
    );

    const defaultCurrency = result.rows[0]?.default_currency || 'GBP';

    if (data.currency !== defaultCurrency) {
      return {
        rule: 'cross_border',
        score: 10,
        reason: `Payment in ${data.currency} but user's default is ${defaultCurrency}`,
        triggered: true,
      };
    }

    return {
      rule: 'cross_border',
      score: 0,
      reason: 'Payment currency matches user default',
      triggered: false,
    };
  }

  //Rule 6 : Round number check
//   Exact round amount like £5,000 = +10 points (money laundering pattern)
  private async checkRoundNumber(data: TransactionData): Promise<FraudRuleResult> {
    const amountGBP = await this.convertToGBP(data.amount, data.currency);

    const isRound = amountGBP >= 1000 && amountGBP % 1000 === 0;

    if (isRound) {
      return {
        rule: 'round_number',
        score: 10,
        reason: `Exact round amount £${amountGBP} — potential structuring`,
        triggered: true,
      };
    }

    return {
      rule: 'round_number',
      score: 0,
      reason: 'Amount is not a suspicious round number',
      triggered: false,
    };
  }


  //Rule 7 : Night Transaction Between 1AM-5AM UTC = +5 points 

    private async checkNightTransaction(data: TransactionData): Promise<FraudRuleResult> {
    const hour = new Date().getUTCHours();

    if (hour >= 1 && hour < 5) {
      return {
        rule: 'night_transaction',
        score: 5,
        reason: `Transaction at ${hour}:00 UTC — unusual hours`,
        triggered: true,
      };
    }

    return {
      rule: 'night_transaction',
      score: 0,
      reason: 'Transaction during normal hours',
      triggered: false,
    };
  }
 
  // HELPER METHODS

  //Convert any currency to GBP for consistent threshold checking 

   private async convertToGBP(amount: number, currency: string): Promise<number> {
    if (currency === 'GBP') return amount;

    try {
      const rateStr = await redis.get(`exchange_rate:${currency}:GBP`);
      if (rateStr) {
        return amount * parseFloat(rateStr);
      }
    } catch (error) {
      logger.warn('Redis rate lookup failed, using fallback rates');
    }

    // Fallback rates (replaced with live rates on Day 6)
    const fallbackRates: Record<string, number> = {
      USD: 0.79,
      EUR: 0.86,
      INR: 0.0095,
    };

    const rate = fallbackRates[currency] || 1;
    return amount * rate;
  }
   
  //Save Fraud check to database (FCA 5 -year retention)
   private async saveFraudCheck(result: FraudCheckResult): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO fraud_checks 
         (user_id, transaction_amount, currency, total_score, decision, rules_triggered, checked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          result.transactionData.userId,
          result.transactionData.amount,
          result.transactionData.currency,
          result.totalScore,
          result.decision,
          JSON.stringify(result.rules.filter(r => r.triggered)),
          result.checkedAt,
        ]
      );
    } catch (error) {
      logger.error('Failed to save fraud check', { error });
    }
  }

  // Cache fraud check in redis (1 hour expiry)
    private async cacheFraudCheck(userId: string, result: FraudCheckResult): Promise<void> {
    try {
      const key = `fraud_check:${userId}:${Date.now()}`;
      await redis.setex(key, 3600, JSON.stringify(result));
    } catch (error) {
      logger.warn('Failed to cache fraud check', { error });
    }
  }

  /**
   * Get fraud history for a user (compliance dashboard)
   */
  async getUserFraudHistory(userId: string, limit: number = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM fraud_checks 
       WHERE user_id = $1 
       ORDER BY checked_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

export default new FraudDetectionService();