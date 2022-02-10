const argv = require("minimist")(process.argv.slice(2));

const availableArguments = [
  "_",
  "h",
  "help",
  "g",
  "generate",
  "r",
  "randomize",
  "d",
  "different-billing",
];

const hasInvalidArgument =
  argv._.length ||
  Object.keys(argv).some((key) => !availableArguments.includes(key));

if (hasInvalidArgument) {
  console.log(
    "Invalid argument, pass -h or --help flag for available arguments"
  );
  return;
}

if (argv.h || argv.help) {
  console.log(`
  Available arguments:
  -g X, --generate X      / Generate user X times.
                          / Default: -g 1
                          / Usage Example:
                          / node index.js -g 10
                          / node index.js --generate 5
                    
  -r, --randomize         / If present, user data will be randomized.
                          / CAREFUL: this might lead to some failures due to randomized nature of user data passed.
                          / Default: false
                          / Usage Example:
                          / node index.js -r
                          / node index.js --randomize
                          
  -d, --different-billing / If present, user billing address will be different than shipping one
                          / CAREFUL: works only when randomize flag is present
                          / Default: false
                          / Usage Example:
                          / node index.js -d
                          / node index.js --different-billing
  `);
  return;
}

const options = {
  generate: argv.g || argv.generate || 1,
  randomize: argv.r || argv.randomize,
  differentBilling: argv.d || argv["different-billing"],
};

const {
  faker: { name, company, address, internet, phone, hacker },
} = require("@faker-js/faker");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const productDataForm = new URLSearchParams();
productDataForm.append("project_sku", process.env.PROJECT_SKU);
productDataForm.append("product_id", process.env.PRODUCT_ID);
productDataForm.append("quantity", "1");

const generateUser = (isRandom) => {
  if (!isRandom) {
    return {
      firstName: "generatedByScript",
      lastName: "generatedByScript",
      company: "",
      country: "PL",
      address1: "generatedByScript",
      address2: "",
      postCode: "00-000",
      city: "generatedByScript",
      state: "",
      phone: "123123123",
      email: internet.email(),
      orderComment: hacker.phrase(),
    };
  }
  const country = address.countryCode();
  const isUS = country === "US";
  const state = address.state();

  return {
    firstName: name.firstName(),
    lastName: name.lastName(),
    company: company.companyName(),
    country: address.countryCode(),
    address1: address.streetAddress(),
    address2: address.secondaryAddress(),
    postCode: isUS ? address.zipCodeByState(state) : address.zipCode("#####"),
    city: address.city(),
    state,
    phone: phone.phoneNumber("##########"),
    email: internet.email(),
    orderComment: hacker.phrase(),
  };
};

const fillFormWithUserData = (form, billingAsShipping, isRandom) => {
  let userData = generateUser(isRandom);

  /* Required fields */
  form.append("billing_first_name", userData.firstName);
  form.append("billing_last_name", userData.lastName);
  form.append("billing_country", userData.country);
  form.append("billing_address_1", userData.address1);
  form.append("billing_postcode", userData.postCode);
  form.append("billing_city", userData.city);
  form.append("billing_state", userData.state);
  form.append("billing_phone", userData.phone);
  form.append("billing_email", userData.email);

  /* Each optional field has 50% chance to be filled */
  form.append("billing_company", Math.random() < 0.5 ? userData.company : "");
  form.append(
    "billing_address_2",
    Math.random() < 0.5 ? userData.address2 : ""
  );

  /* Regenerate user when shipping address is different than billing one */
  if (!billingAsShipping) {
    userData = generateUser(isRandom);
    form.append("ship_to_different_address", "1");
  }
  /* Required fields */
  form.append("shipping_first_name", userData.firstName);
  form.append("shipping_last_name", userData.lastName);
  form.append("shipping_country", userData.country);
  form.append("shipping_address_1", userData.address1);
  form.append("shipping_postcode", userData.postCode);
  form.append("shipping_city", userData.city);
  form.append("shipping_state", userData.state);
  form.append("shipping_phone", userData.phone);
  form.append("shipping_email", userData.email);

  /* Each optional field has 50% chance to be filled */
  form.append("shipping_company", Math.random() < 0.5 ? userData.company : "");
  form.append(
    "shipping_address_2",
    Math.random() < 0.5 ? userData.address2 : ""
  );

  form.append(
    "order_comments",
    Math.random() < 0.5 ? userData.orderComment : ""
  );
};

const generateOrder = async () => {
  const userDataForm = new URLSearchParams();

  fillFormWithUserData(
    userDataForm,
    !options.differentBilling,
    options.randomize
  );

  userDataForm.append("shipping_method[0]", "flat_rate:2");
  userDataForm.append("payment_method", "cod");
  userDataForm.append(
    "woocommerce-process-checkout-nonce",
    process.env.WOO_COMMERCE_PROCESS_CHECKOUT_NONCE
  );

  const addToCartResponse = await axios.request({
    url: `${process.env.SHOP_URL}/?wc-ajax=add_to_cart`,
    method: "POST",
    headers: {
      cookie: process.env.COOKIE,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    data: productDataForm,
  });

  const cartHash = addToCartResponse.data.cart_hash;

  const orderResponse = await axios.request({
    url: `${process.env.SHOP_URL}/?wc-ajax=checkout`,
    method: "POST",
    headers: {
      cookie: `${process.env.COOKIE}; woocommerce_items_in_cart=1; woocommerce_cart_hash=${cartHash}`,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    data: userDataForm,
  });

  if (orderResponse.data.order_id) {
    console.log(
      "\x1b[32m",
      `success - order: ${orderResponse.data.order_id} has been created!`
    );
  } else {
    console.log("\x1b[31m", "failure - something went wrong!");
    console.log(orderResponse.data.messages);
  }
};

const main = async () => {
  for (let i = 0; i < options.generate; i++) {
    await generateOrder();
  }
};

main();
