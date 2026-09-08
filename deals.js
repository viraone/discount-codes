// Known / typical offers per site. These are standing programs, not one-off codes —
// update the value + LAST_VERIFIED when you re-check. Keys must match `name` in sources.js.
const LAST_VERIFIED = "2026-09-07";
const DEALS = {
  // Coupon sites
  "RetailMeNot": { offer: "Store codes: typically $10–$100 off electronics", type: "code" },
  "Honey (PayPal)": { offer: "Auto-applies best code at checkout + Honey Gold rewards", type: "tool" },
  "Slickdeals Coupons": { offer: "Community-verified codes, often 10–20% off at Best Buy/Target", type: "code" },
  "Coupons.com": { offer: "Retailer promo codes, varies by store", type: "code" },
  "CouponFollow": { offer: "Codes with success-rate %, varies", type: "code" },
  "Groupon Coupons": { offer: "Exclusive Best Buy / Walmart codes, varies", type: "code" },
  "Dealspotr": { offer: "Verified codes, avg 10–15% off", type: "code" },
  "Knoji": { offer: "Codes + \"does this brand offer X discount\" answers", type: "code" },
  "Wethrift": { offer: "Codes tested this week, typically 5–20%", type: "code" },
  "SimplyCodes": { offer: "Verified codes, shows last-worked time", type: "code" },
  "CouponBirds": { offer: "Codes w/ success rate, varies", type: "code" },
  "Offers.com": { offer: "Store codes + free shipping, varies", type: "code" },
  "Promocodes.com": { offer: "Verified store codes, varies", type: "code" },
  "DontPayFull": { offer: "Codes + price-drop alerts, varies", type: "code" },

  // Retailers
  "Sony Store (if Sony product)": { offer: "Frequent $100–$500 off select BRAVIA; free shipping", type: "sale" },
  "Sony Certified Refurbished": { offer: "Up to 30% off list w/ 90-day warranty", type: "refurb" },
  "Best Buy": { offer: "Weekly TV sales; price match; My Best Buy Plus extras", type: "sale" },
  "Best Buy Open-Box": { offer: "Typically 10–30% off (Excellent/Certified)", type: "refurb" },
  "Best Buy Outlet": { offer: "Clearance & open-box up to 50% off", type: "refurb" },
  "Amazon": { offer: "Lightning deals & coupons; frequent 15–25% off TVs", type: "sale" },
  "Amazon Warehouse (used/open-box)": { offer: "Typically 15–50% off list, 30-day returns", type: "refurb" },
  "Walmart": { offer: "Rollbacks; Walmart+ free shipping", type: "sale" },
  "Target": { offer: "Target Circle offers; 5% off w/ Target Circle Card", type: "sale" },
  "Costco": { offer: "Member pricing; often $50–$300 off + 2-yr warranty", type: "sale" },
  "Sam's Club": { offer: "Member pricing; Instant Savings events", type: "sale" },
  "B&H Photo": { offer: "Instant savings; no sales tax outside NY/NJ (Payboo card)", type: "sale" },
  "Adorama": { offer: "Instant rebates; price match", type: "sale" },
  "Abt Electronics": { offer: "Price match + free shipping", type: "sale" },
  "Crutchfield": { offer: "Free shipping + free lifetime tech support", type: "sale" },
  "Newegg": { offer: "Shell Shocker daily deals; promo codes", type: "sale" },
  "eBay (Sony official outlet too)": { offer: "Certified Refurb up to 40% off; eBay coupon codes", type: "refurb" },
  "Woot (Amazon deals)": { offer: "Daily deals up to 60% off; free Prime shipping", type: "sale" },

  // Cashback
  "Rakuten": { offer: "1–10% cash back (often 2–5% on electronics) + $30 new-member bonus", type: "cashback" },
  "TopCashback": { offer: "Up to ~5% cash back at Best Buy/Walmart", type: "cashback" },
  "Honey Gold": { offer: "Gold points at 30k+ stores (~1–5% back)", type: "cashback" },
  "Capital One Shopping": { offer: "Rewards + auto coupon testing", type: "cashback" },
  "BeFrugal": { offer: "Up to 4% cash back + $10 sign-up bonus", type: "cashback" },
  "Ibotta": { offer: "Cash back on online electronics purchases", type: "cashback" },
  "PayPal Honey Rewards": { offer: "Rewards when paying with PayPal", type: "cashback" },

  // Price trackers
  "Google Shopping": { offer: "Compares all store prices; price-drop tracking", type: "tool" },
  "CamelCamelCamel (Amazon history)": { offer: "Amazon price history + drop alerts", type: "tool" },
  "Keepa": { offer: "Price history charts + alerts", type: "tool" },
  "PriceGrabber": { offer: "Price comparison across stores", type: "tool" },
  "Shopzilla": { offer: "Price comparison", type: "tool" },
  "PriceSpy": { offer: "UK price history & alerts", type: "tool" },
  "Bing Shopping": { offer: "Price comparison + Microsoft Rewards", type: "tool" },
  "Klarna Price Compare": { offer: "Price comparison + pay-in-4", type: "tool" },

  // Communities
  "Slickdeals": { offer: "Front-page deals; frontpage TVs often 20–40% off", type: "community" },
  "Reddit r/deals": { offer: "User-posted deals & codes", type: "community" },
  "Reddit r/buildapcsales (TVs)": { offer: "Monitor/TV price drops posted daily", type: "community" },
  "Reddit r/bravia": { offer: "Sony owners share sales & codes", type: "community" },
  "Reddit r/4kTV": { offer: "TV deal threads & buying advice", type: "community" },
  "DealNews": { offer: "Editor-vetted deals, \"lowest price ever\" tags", type: "community" },
  "Ben's Bargains": { offer: "Curated daily deals", type: "community" },
  "TechBargains": { offer: "Tech-only deals & codes", type: "community" },
  "Brad's Deals": { offer: "Hand-picked deals", type: "community" },
  "Kinja Deals": { offer: "Daily deal roundups", type: "community" },
  "HotUKDeals (UK)": { offer: "UK community deals & codes", type: "community" },
  "RedFlagDeals (Canada)": { offer: "Canadian deals & codes", type: "community" },
  "OzBargain (Australia)": { offer: "Australian deals & codes", type: "community" },

  // Web searches
  "Google: \"promo code\"": { offer: "Finds codes on blogs & small sites", type: "tool" },
  "Google: \"coupon code\" past month": { offer: "Fresh codes only (last 30 days)", type: "tool" },
  "Google: \"discount code\"": { offer: "Alternate phrasing catches more", type: "tool" },
  "Google: open box / refurbished": { offer: "Finds refurb listings across stores", type: "tool" },
  "Google: student / military discount": { offer: "Finds eligibility programs", type: "tool" },
  "Google News: Sony TV deals": { offer: "News-site deal roundups", type: "tool" },
  "DuckDuckGo: coupon": { offer: "Different index = different results", type: "tool" },
  "Bing: promo code": { offer: "Earns Microsoft Rewards while searching", type: "tool" },
  "YouTube: deal reviews": { offer: "Creators often share exclusive codes", type: "tool" },
  "X / Twitter: deals": { offer: "Real-time deal accounts", type: "tool" },

  // Special programs
  "Sony Education Store (students/teachers)": { offer: "10% off for students, teachers & staff", type: "program" },
  "Sony Military & First Responder (via ID.me)": { offer: "10% off for military, veterans & first responders", type: "program" },
  "Best Buy Student Deals": { offer: "Exclusive student pricing on tech", type: "program" },
  "Best Buy Price Match Guarantee": { offer: "Matches Amazon, Walmart, Target, Costco & more", type: "program" },
  "Amazon Price Match / Deals page": { offer: "Today's Deals hub; Prime-exclusive pricing", type: "sale" },
  "Costco Warehouse Savings": { offer: "Monthly member-only savings book", type: "sale" },
  "Target Circle Offers": { offer: "Personalized % off offers; 5% w/ Circle Card", type: "program" },
  "Walmart Flash Deals": { offer: "Limited-time flash deals", type: "sale" }
};
