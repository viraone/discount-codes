// Every source is a URL template. {q} = URL-encoded query, {qp} = plus-joined query, {qd} = dash-joined query.
// "top" = included in the "Open all top coupon sites" button.
// "only" = a regex; the source is shown only when the cleaned query matches it (brand/category-specific sites).
// "q" (on a category or an item) = which query the site gets: "full" (default) = the whole product name,
//   "core" = brand + category ("epson projector") for deal communities that only index posted deals,
//   "brand" = just the brand ("epson") for coupon/cashback sites that index stores, not products.
// Clothing / workwear / footwear queries. Electronics-only stores carry "not: APPAREL" so they don't show for them.
const APPAREL = /\b(carhartt|dickies|levi'?s?|wrangler|pants?|jeans?|dungarees?|shorts|jackets?|coats?|hoodies?|sweatshirts?|shirts?|tees?|boots?|shoes?|sneakers?|socks|gloves|beanies?|overalls|bibs?|workwear|apparel|clothing|north face|patagonia|nike|adidas|hoka|new balance)\b/i;
const SOURCES = [
  {
    category: "🏷️ Coupon & Promo Code Sites",
    blurb: "Searched by brand — coupon sites list codes per store (Epson, Best Buy, Amazon), not per product.",
    q: "brand",
    items: [
      { name: "RetailMeNot", url: "https://www.retailmenot.com/s/{q}", top: true },
      { name: "Honey (PayPal)", url: "https://www.joinhoney.com/search?q={q}", top: true },
      { name: "Coupons.com", url: "https://www.coupons.com/search/?q={q}" },
      { name: "Slickdeals Coupons", url: "https://slickdeals.net/coupons/search/?q={q}", top: true },
      { name: "CouponFollow", url: "https://couponfollow.com/search?q={q}" },
      { name: "Groupon Coupons", url: "https://www.groupon.com/coupons/search?query={q}" },
      { name: "Dealspotr", url: "https://dealspotr.com/search?q={q}" },
      { name: "Knoji", url: "https://knoji.com/search/?q={q}" },
      { name: "Wethrift", url: "https://www.wethrift.com/search?q={q}" },
      { name: "SimplyCodes", url: "https://simplycodes.com/search?q={q}" },
      { name: "CouponBirds", url: "https://www.couponbirds.com/search?q={q}" },
      { name: "Offers.com", url: "https://www.offers.com/search/?q={q}" },
      { name: "Promocodes.com", url: "https://www.promocodes.com/search?q={q}" },
      { name: "DontPayFull", url: "https://www.dontpayfull.com/search?q={q}" }
    ]
  },
  {
    category: "🏪 Retailer Deal Pages (direct)",
    blurb: "Each card opens that store's own search. We can't see their stock, so a result may be empty or sold out — check the verified prices above first.",
    items: [
      { name: "Sony Store", url: "https://electronics.sony.com/search?q={q}", top: true, only: /sony|bravia|playstation|ps5/i },
      { name: "Sony Certified Refurbished", url: "https://electronics.sony.com/refurbished/c/refurbished", only: /sony|bravia/i },
      { name: "Best Buy", url: "https://www.bestbuy.com/site/searchpage.jsp?st={q}&sp=-currentprice%20skuidsaas", top: true, not: APPAREL },
      { name: "Best Buy Open-Box", url: "https://www.bestbuy.com/site/searchpage.jsp?st={q}&qp=condition_facet%3DCondition~Open-Box&sp=-currentprice%20skuidsaas", not: APPAREL },
      { name: "Best Buy Outlet", url: "https://www.bestbuy.com/site/misc/deal-of-the-day/pcmcat248000050016.c?id=pcmcat248000050016", not: APPAREL },
      { name: "Amazon", url: "https://www.amazon.com/s?k={q}&s=price-asc-rank", top: true },
      { name: "Amazon Warehouse (used/open-box)", url: "https://www.amazon.com/s?k={q}&rh=p_n_condition-type%3A6461716011&s=price-asc-rank" },
      { name: "Walmart", url: "https://www.walmart.com/search?q={q}&sort=price_low" },
      { name: "Target", url: "https://www.target.com/s?searchTerm={q}&sortBy=PriceLow" },
      { name: "Costco", url: "https://www.costco.com/CatalogSearch?keyword={q}" },
      { name: "Sam's Club", url: "https://www.samsclub.com/s/{q}" },
      { name: "B&H Photo", url: "https://www.bhphotovideo.com/c/search?q={q}&sort=PRICE_LOW_TO_HIGH", not: APPAREL },
      { name: "Adorama", url: "https://www.adorama.com/l/?searchinfo={q}", not: APPAREL },
      { name: "Abt Electronics", url: "https://www.abt.com/resources/pages/search.php?keywords={q}", not: APPAREL },
      { name: "Crutchfield", url: "https://www.crutchfield.com/search.aspx?search={q}", not: APPAREL },
      { name: "Newegg", url: "https://www.newegg.com/p/pl?d={q}&Order=1", not: APPAREL },
      { name: "Carhartt", url: "https://www.carhartt.com/search?q={q}", top: true, only: /carhartt/i },
      { name: "Dick's Sporting Goods", url: "https://www.dickssportinggoods.com/search/SearchDisplay?searchTerm={q}", only: APPAREL },
      { name: "Tractor Supply", url: "https://www.tractorsupply.com/tsc/search/{q}", only: APPAREL },
      { name: "Boot Barn", url: "https://www.bootbarn.com/search?q={q}", only: APPAREL },
      { name: "Zappos", url: "https://www.zappos.com/search?term={q}", only: APPAREL },
      { name: "Kohl's", url: "https://www.kohls.com/search.jsp?search={q}", only: APPAREL },
      { name: "eBay (brand outlets too)", url: "https://www.ebay.com/sch/i.html?_nkw={q}&LH_ItemCondition=1000%7C1500%7C2000%7C2500&_sop=15" },
      { name: "Woot (Amazon deals)", url: "https://www.woot.com/search?query={q}" }
    ]
  },
  {
    category: "💸 Cashback Portals (stack on top of codes)",
    blurb: "Searched by brand/store. Activate before you buy — cashback stacks with coupon codes and sale prices.",
    q: "brand",
    items: [
      { name: "Rakuten", url: "https://www.rakuten.com/search?term={q}", top: true },
      { name: "TopCashback", url: "https://www.topcashback.com/search/merchants/?s={q}" },
      { name: "Honey Gold", url: "https://www.joinhoney.com/search?q={q}" },
      { name: "Capital One Shopping", url: "https://capitaloneshopping.com/s/{qd}" },
      { name: "BeFrugal", url: "https://www.befrugal.com/search/?q={q}" },
      { name: "Ibotta", url: "https://ibotta.com/search?q={q}" },
      { name: "PayPal Honey Rewards", url: "https://www.paypal.com/shopping/search?q={q}" }
    ]
  },
  {
    category: "📉 Price Trackers & Comparison",
    blurb: "See if today's price is a real deal, and set alerts for drops.",
    items: [
      { name: "Google Shopping", url: "https://www.google.com/search?tbm=shop&q={q}&tbs=p_ord:p", top: true },
      { name: "CamelCamelCamel (Amazon history)", url: "https://camelcamelcamel.com/search?sq={q}" },
      { name: "Keepa", url: "https://keepa.com/#!search/1-{q}" },
      { name: "PriceGrabber", url: "https://www.pricegrabber.com/search/?q={q}" },
      { name: "Shopzilla", url: "https://www.shopzilla.com/search?q={q}" },
      { name: "PriceSpy", url: "https://pricespy.co.uk/search?search={q}" },
      { name: "Bing Shopping", url: "https://www.bing.com/shop?q={q}" },
      { name: "Klarna Price Compare", url: "https://www.klarna.com/us/shopping/search/?q={q}" }
    ]
  },
  {
    category: "🔥 Deal Communities & Forums",
    blurb: "Searched by brand + category so posted deals actually show up; sorted lowest price first where the site allows.",
    q: "core",
    items: [
      { name: "Slickdeals", url: "https://slickdeals.net/search?q={q}&sort=price_low", top: true },
      { name: "Reddit r/deals", url: "https://www.reddit.com/r/deals/search/?q={q}&restrict_sr=1&sort=new" },
      { name: "Reddit r/buildapcsales", url: "https://www.reddit.com/r/buildapcsales/search/?q={q}&restrict_sr=1&sort=new", only: /\b(tv|monitor|gpu|rtx|nvidia|ssd|cpu|ram|laptop|pc)\b/i },
      { name: "Reddit r/bravia", url: "https://www.reddit.com/r/bravia/search/?q=deal+{q}&restrict_sr=1&sort=new", only: /sony|bravia/i },
      { name: "Reddit r/4kTV", url: "https://www.reddit.com/r/4kTV/search/?q={q}&restrict_sr=1&sort=new", only: /\btv\b|oled|qled|bravia/i },
      { name: "DealNews", url: "https://www.dealnews.com/search.html?search={q}" },
      { name: "Ben's Bargains", url: "https://bensbargains.com/search/?q={q}" },
      { name: "TechBargains", url: "https://www.techbargains.com/search?q={q}" },
      { name: "Brad's Deals", url: "https://www.bradsdeals.com/search?q={q}" },
      { name: "Kinja Deals", url: "https://kinjadeals.theinventory.com/search?q={q}" },
      { name: "HotUKDeals (UK)", url: "https://www.hotukdeals.com/search?q={q}" },
      { name: "RedFlagDeals (Canada)", url: "https://www.redflagdeals.com/search/#!/q={q}" },
      { name: "OzBargain (Australia)", url: "https://www.ozbargain.com.au/search/node/{q}" }
    ]
  },
  {
    category: "🔎 Raw Web Searches (the nooks & crannies)",
    blurb: "Pre-built search queries that dig up codes hiding in blogs, news, and small sites.",
    items: [
      { name: "Google: \"promo code\"", url: "https://www.google.com/search?q={q}+%22promo+code%22", top: true },
      { name: "Google: \"coupon code\" past month", url: "https://www.google.com/search?q={q}+%22coupon+code%22&tbs=qdr:m" },
      { name: "Google: \"discount code\"", url: "https://www.google.com/search?q={q}+%22discount+code%22" },
      { name: "Google: open box / refurbished", url: "https://www.google.com/search?q={q}+open+box+OR+refurbished+deal" },
      { name: "Google: student / military discount", url: "https://www.google.com/search?q={q}+student+OR+military+OR+education+discount" },
      { name: "Google News: deals", url: "https://news.google.com/search?q={q}+deal+OR+sale" },
      { name: "Google: brand's official store", url: "https://www.google.com/search?q={q}+official+store+coupon+OR+promo" },
      { name: "DuckDuckGo: coupon", url: "https://duckduckgo.com/?q={q}+coupon+code" },
      { name: "Bing: promo code", url: "https://www.bing.com/search?q={q}+promo+code" },
      { name: "YouTube: deal reviews", url: "https://www.youtube.com/results?search_query={q}+deal" },
      { name: "X / Twitter: deals", url: "https://x.com/search?q={q}+deal+OR+coupon&f=live" }
    ]
  },
  {
    category: "🎁 Special Programs & Hidden Discounts",
    blurb: "Discounts most people never check.",
    items: [
      { name: "Sony Education Store (students/teachers)", url: "https://electronics.sony.com/education-store", only: /sony|bravia|playstation|ps5/i },
      { name: "Sony Military & First Responder (via ID.me)", url: "https://www.id.me/shop/sony", only: /sony|bravia|playstation|ps5/i },
      { name: "Best Buy Student Deals", url: "https://www.bestbuy.com/site/misc/student-deals/pcmcat276200050000.c?id=pcmcat276200050000", not: APPAREL },
      { name: "Best Buy Price Match Guarantee", url: "https://www.bestbuy.com/site/help-topics/price-match-guarantee/pcmcat297300050000.c?id=pcmcat297300050000", not: APPAREL },
      { name: "Amazon Price Match / Deals page", url: "https://www.amazon.com/deals" },
      { name: "Costco Warehouse Savings", url: "https://www.costco.com/warehouse-savings.html" },
      { name: "Target Circle Offers", url: "https://www.target.com/circle" },
      { name: "Walmart Flash Deals", url: "https://www.walmart.com/shop/deals/flash-deals" }
    ]
  }
];
