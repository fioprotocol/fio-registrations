<!-- https://commerce.coinbase.com/docs/ -->
<template>
  <div>
    <a class="buy-with-crypto" data-custom="MY_CUSTOM_DATA" href="https://commerce.coinbase.com/checkout/6da189f179bc31">
      <span>This is a button.</span>
    </a>
    <script src="https://commerce.coinbase.com/v1/checkout.js"></script>
  </div>
</template>

<script src="https://commerce.coinbase.com/v1/checkout.js?onload=SOME_CALLBACK_FUNCTION"/>
<script>
BuyWithCrypto.registerCallback('onSuccess', function(e){
    // Charge was successfully completed
    console.log('coinbase success', e);
});

BuyWithCrypto.registerCallback('onFailure', function(e){
    // Charge failed
    console.log('coinbase fail', e);
});

BuyWithCrypto.registerCallback('onPaymentDetected', function(e){
    // Payment has been detected but not yet confirmed
    console.log('coinbase payment detected', e);
});
</script>
<!-- {
    buttonId: "unique id for this embeddable button",
    code: CHARGE_CODE,
    event: "charge_failed" OR "charge_confirmed" OR "payment_detected"
} -->
