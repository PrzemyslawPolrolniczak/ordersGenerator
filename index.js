const args = process.argv.slice(2);
const repeatTimes = args.length ? parseInt(args[0]) : 1;

if (isNaN(repeatTimes)) {
  console.log('Invalid argument. Program is expecting number')
  return;
}

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const formData = new URLSearchParams();
formData.append('project_sku', process.env.PROJECT_SKU);
formData.append('product_id', process.env.PRODUCT_ID);
formData.append('quantity', '1');

const secondForm = new URLSearchParams();
secondForm.append('billing_first_name', 'generatedByScript');
secondForm.append('billing_last_name', 'generatedByScript');
secondForm.append('billing_company', '');
secondForm.append('billing_country', 'PL');
secondForm.append('billing_address_1', 'generatedByScript');
secondForm.append('billing_address_2', 'generatedByScript');
secondForm.append('billing_postcode', '00-000');
secondForm.append('billing_city', 'generatedByScript');
secondForm.append('billing_state', '');
secondForm.append('billing_phone', '123123123');
secondForm.append('billing_email', 'wp-test@lulu.com');
secondForm.append('shipping_first_name', 'generatedByScript');
secondForm.append('shipping_last_name', 'generatedByScript');
secondForm.append('shipping_company', '');
secondForm.append('shipping_country', 'PL');
secondForm.append('shipping_address_1', 'generatedByScript');
secondForm.append('shipping_address_2', 'generatedByScript');
secondForm.append('shipping_postcode', '00-000');
secondForm.append('shipping_city', 'generatedByScript');
secondForm.append('shipping_state', '');
secondForm.append('shipping_phone', '123123123');
secondForm.append('shipping_email', 'wp-test@lulu.com');
secondForm.append('order_comments', '');
secondForm.append('shipping_method[0]', 'flat_rate:2');
secondForm.append('payment_method', 'cod');
secondForm.append('_wp_http_referer', '/?wc-ajax=update_order_review');
secondForm.append('woocommerce-process-checkout-nonce', process.env.WOO_COMMERCE_PROCESS_CHECKOUT_NONCE);

const generateOrder = async () => {
  const addToCartResponse = await axios.request({
    url: `${process.env.SHOP_URL}/?wc-ajax=add_to_cart`,
    method: 'POST',
    headers: {
      cookie: process.env.COOKIE,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    data: formData
  });

  const cartHash = addToCartResponse.data.cart_hash

  const orderResponse = await axios.request({
    url: 'https://ppolrolniczak-dev-wordpress.testing.lulu.com/?wc-ajax=checkout',
    method: 'POST',
    headers: {
      cookie: `${process.env.COOKIE}; woocommerce_items_in_cart=1; woocommerce_cart_hash=${cartHash}`,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    data: secondForm
  });

  if (orderResponse.data.order_id) {
    console.log('\x1b[32m', `success - order: ${orderResponse.data.order_id} has been created!`)
  } else {
    console.log('\x1b[31m', 'failure - something went wrong!')
  }
}

const main = async () => {
  for (let i = 0; i < repeatTimes; i++) {
    await generateOrder();
  }
}

main();

