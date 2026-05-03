export interface ProcessorResult{
    success: boolean;
    chargeId: string;
    status: string;
    error?: string;
}

export interface PaymentProcessor{
    name: string;
    charge(
        amount: number,
        currency: string,
        cardToken: string
    ): Promise<ProcessorResult>;
    refund(chargeId: string): Promise<ProcessorResult>;
}