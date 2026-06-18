#!/usr/bin/env node
/*
  FitPick test account + wardrobe seed script.
  This creates/logs in a test user and creates metadata-only wardrobe items through the API.
  It does not upload real image files. Use the images folder for UI upload tests.

  Usage:
  BASE_URL=http://127.0.0.1:3000 \
  TEST_EMAIL=fitpick.test@example.com \
  TEST_PASSWORD='FitPickTest123!' \
  TEST_NAME='FitPick Tester' \
  node scripts/seed-fitpick-test-user.mjs
*/

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.TEST_EMAIL || 'fitpick.test@example.com';
const password = process.env.TEST_PASSWORD || 'FitPickTest123!';
const name = process.env.TEST_NAME || 'FitPick Tester';

let cookie = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let body = null;
  try { body = await res.json(); } catch {}
  return { res, body };
}

async function registerOrLogin() {
  let out = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (out.res.ok) return out;
  out = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!out.res.ok) {
    console.error('Could not register/login:', out.body);
    process.exit(1);
  }
  return out;
}

const items = [
  { name: 'White Oxford Shirt', category: 'Tops', subcategory: 'Shirt', color: 'White', pattern: 'Plain', fabric: 'Cotton', fit: 'Regular', formality: ['Work','Smart casual'], occasions: ['Work','Interview','Business meeting','Church'], weather: ['Hot day','Indoor'], condition: 'ready' },
  { name: 'Navy Polo Shirt', category: 'Tops', subcategory: 'Polo', color: 'Navy', pattern: 'Plain', fabric: 'Cotton', fit: 'Regular', formality: ['Casual','Smart casual'], occasions: ['School','Casual hangout','Travel'], weather: ['Hot day','Outdoor'], condition: 'ready' },
  { name: 'Ankara Pattern Top', category: 'Tops', subcategory: 'Native top', color: 'Multicolor', pattern: 'Ankara', fabric: 'Cotton', fit: 'Regular', formality: ['Traditional','Smart casual'], occasions: ['Native Friday','Traditional event','Owambe'], weather: ['Hot day'], condition: 'ready' },
  { name: 'Dark Work Trousers', category: 'Bottoms', subcategory: 'Trousers', color: 'Black', pattern: 'Plain', fabric: 'Cotton blend', fit: 'Regular', formality: ['Work','Formal'], occasions: ['Work','Interview','Business meeting','Church'], weather: ['Indoor','Hot day'], condition: 'ready' },
  { name: 'Blue Denim Jeans', category: 'Bottoms', subcategory: 'Jeans', color: 'Blue', pattern: 'Plain', fabric: 'Denim', fit: 'Regular', formality: ['Casual'], occasions: ['School','Casual hangout','Travel'], weather: ['Dry','Outdoor'], condition: 'ready' },
  { name: 'Beige Chinos', category: 'Bottoms', subcategory: 'Chinos', color: 'Beige', pattern: 'Plain', fabric: 'Cotton', fit: 'Regular', formality: ['Smart casual'], occasions: ['Work','Date/social outing','Church'], weather: ['Hot day'], condition: 'ready' },
  { name: 'Black Loafers', category: 'Shoes', subcategory: 'Loafers', color: 'Black', pattern: 'Plain', fabric: 'Leather', fit: 'Regular', formality: ['Work','Formal','Smart casual'], occasions: ['Work','Interview','Business meeting','Church','Native Friday'], weather: ['Indoor','Dry'], condition: 'ready' },
  { name: 'White Sneakers', category: 'Shoes', subcategory: 'Sneakers', color: 'White', pattern: 'Plain', fabric: 'Leather', fit: 'Comfortable', formality: ['Casual'], occasions: ['School','Casual hangout','Travel'], weather: ['Dry'], condition: 'ready' },
  { name: 'Brown Sandals', category: 'Shoes', subcategory: 'Sandals', color: 'Brown', pattern: 'Plain', fabric: 'Leather', fit: 'Comfortable', formality: ['Casual','Traditional'], occasions: ['Traditional event','Owambe','Casual hangout'], weather: ['Hot day','Dry'], condition: 'ready' },
  { name: 'Cream Senator Wear', category: 'Native/traditional', subcategory: 'Senator wear', color: 'Cream', pattern: 'Plain', fabric: 'Cotton', fit: 'Regular', formality: ['Traditional','Smart casual'], occasions: ['Native Friday','Church','Traditional event'], weather: ['Hot day'], condition: 'ready' },
  { name: 'Emerald Agbada', category: 'Native/traditional', subcategory: 'Agbada', color: 'Green', pattern: 'Embroidered', fabric: 'Cotton', fit: 'Loose', formality: ['Ceremonial','Traditional'], occasions: ['Owambe','Wedding','Traditional event'], weather: ['Indoor'], condition: 'ready' },
  { name: 'Lace Owambe Outfit', category: 'Native/traditional', subcategory: 'Lace outfit', color: 'Burgundy', pattern: 'Lace', fabric: 'Lace', fit: 'Regular', formality: ['Ceremonial','Traditional'], occasions: ['Owambe','Wedding','Traditional event'], weather: ['Indoor'], condition: 'ready' },
  { name: 'Charcoal Blazer', category: 'Outerwear', subcategory: 'Blazer', color: 'Charcoal', pattern: 'Plain', fabric: 'Wool blend', fit: 'Structured', formality: ['Work','Formal'], occasions: ['Interview','Business meeting','Work'], weather: ['Indoor','Cold day'], condition: 'ready' },
  { name: 'Olive Rain Jacket', category: 'Outerwear', subcategory: 'Rain jacket', color: 'Olive', pattern: 'Plain', fabric: 'Water resistant', fit: 'Regular', formality: ['Casual'], occasions: ['Rainy day','Travel'], weather: ['Rainy day','Outdoor'], condition: 'ready' },
  { name: 'Cream Cardigan', category: 'Outerwear', subcategory: 'Cardigan', color: 'Cream', pattern: 'Plain', fabric: 'Knit', fit: 'Regular', formality: ['Smart casual'], occasions: ['Work','Church','Travel'], weather: ['Cold day','Indoor'], condition: 'ready' },
  { name: 'Brown Leather Belt', category: 'Accessories', subcategory: 'Belt', color: 'Brown', pattern: 'Plain', fabric: 'Leather', fit: 'Regular', formality: ['Work','Smart casual'], occasions: ['Work','Interview','Business meeting'], weather: ['Indoor','Dry'], condition: 'ready' },
  { name: 'Gold Watch', category: 'Accessories', subcategory: 'Watch', color: 'Gold', pattern: 'Metallic', fabric: 'Metal', fit: 'Regular', formality: ['Work','Formal','Traditional'], occasions: ['Work','Wedding','Owambe','Business meeting'], weather: ['Indoor','Dry'], condition: 'ready' },
  { name: 'Black Tote Bag', category: 'Bags', subcategory: 'Tote', color: 'Black', pattern: 'Plain', fabric: 'Leather', fit: 'Regular', formality: ['Work','Travel'], occasions: ['Work','Travel','School'], weather: ['Indoor','Dry'], condition: 'ready' }
];

async function createItem(item) {
  const out = await request('/api/wardrobe', { method: 'POST', body: JSON.stringify(item) });
  if (!out.res.ok) console.log('Failed:', item.name, out.body);
  else console.log('Created:', item.name);
}

await registerOrLogin();
console.log('Authenticated test user:', email);
for (const item of items) await createItem(item);
console.log('Done. Open FitPick and test /wardrobe, /occasion, /outfit.');
