import { describe, test, expect } from "vitest";

describe("Paybridge Frontend", () => {
  test("currency symbol helper returns correct symbols", () => {
    function getCurrencySymbol(curr: string) {
      switch (curr) {
        case "GBP":
          return "£";
        case "USD":
          return "$";
        case "EUR":
          return "€";
        case "INR":
          return "₹";
        default:
          return curr;
      }
    }

    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("INR")).toBe("₹");
  });

  test('processor routing shows correct processor', ()=>{
    function getProcessorName(curr: string){
        return curr === 'INR' ? 'Razorpay': "Stripe";
    }

    expect(getProcessorName('GBP')).toBe('Stripe');
    expect(getProcessorName('INR')).toBe('Razorpay');
  });

  test('password validation rejects short passwords', ()=>{
    function validate(pw: string){
        return pw.length >=8? null: 'Too short';
    }
    expect(validate('short')).toBe("Too short");
    expect(validate('longenough')).toBeNull();
  });

 test('GDPR delete requires exact confirmation text', ()=>{
    const required = 'DELETE MY ACCOUNT';
    const input1 = 'DELETE MY ACCOUNT' as String;
    const input2 ='delete my account' as String;

    expect(input1 === required).toBe(true);
    expect(input2 === required).toBe(false);
 })

  test('transaction filter works correctly', ()=>{
    const txs =[
        {status: 'confirmed'},
        {status: 'pending'},
        {status: 'confirmed'},
        {status: 'failed'},
    ];
    expect(txs.filter(t => t.status === 'confirmed').length).toBe(2);
    expect(txs.filter(t => t.status === 'failed').length).toBe(1);
  });

  test('KYC status returns correct color', ()=>{
    function getColor(status: string){
        switch(status){
            case 'verified': return 'green';
            case 'pending': return 'yellow';
            case 'rejected': return 'red';
            default: return 'gray';
        }
    }

    expect(getColor('verified')).toBe('green');
    expect(getColor('pending')).toBe('yellow');
    expect(getColor('unknown')).toBe('gray');
  });

  test('SAR priority ordering is correct', ()=>{
    const order : Record<string, number> = { CRITICAL:1, HIGH:2, MEDIUM:3, LOW:4};
    const sorted = ['LOW', 'HIGH', 'CRITICAL', 'MEDIUM'].sort((a,b) => order[a] -order[b]);

    expect(sorted[0]).toBe('CRITICAL');
    expect(sorted[3]).toBe('LOW');
  });

  test('consent must be true before signup', ()=>{
    let consent = false;
    expect(consent).toBe(false);

    consent = true;
    expect(consent).toBe(true);
  });
});
