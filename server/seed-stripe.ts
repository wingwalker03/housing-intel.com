import { getUncachableStripeClient } from './stripeClient';

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();

  const existing = await stripe.products.search({ query: "name:'API Access'" });
  if (existing.data.length > 0) {
    console.log('Stripe products already exist, skipping seed');
    return;
  }

  console.log('Creating Stripe products...');

  const apiProduct = await stripe.products.create({
    name: 'API Access',
    description: 'Access to Housing Intel REST API with real-time housing and rental data',
    metadata: { plan: 'api' },
  });
  await stripe.prices.create({
    product: apiProduct.id,
    unit_amount: 1499,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'api' },
  });
  console.log(`Created API product: ${apiProduct.id}`);

  const embedProduct = await stripe.products.create({
    name: 'Embed Widgets',
    description: 'Embeddable interactive maps and charts for your website',
    metadata: { plan: 'embed' },
  });
  await stripe.prices.create({
    product: embedProduct.id,
    unit_amount: 2499,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'embed' },
  });
  console.log(`Created Embed product: ${embedProduct.id}`);

  const bothProduct = await stripe.products.create({
    name: 'API + Embed Bundle',
    description: 'Full access to both the REST API and embeddable widgets',
    metadata: { plan: 'both' },
  });
  await stripe.prices.create({
    product: bothProduct.id,
    unit_amount: 2999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'both' },
  });
  console.log(`Created Bundle product: ${bothProduct.id}`);

  console.log('Stripe products created successfully!');
}

seedStripeProducts().catch(console.error);
