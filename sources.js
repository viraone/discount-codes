// Every source is a URL template. {q} = URL-encoded query, {qp} = plus-joined query, {qd} = dash-joined query.
// "top" = included in the "Open all top coupon sites" button.
const SOURCES = [
  {
    category: "🏷️ Coupon & Promo Code Sites",
    blurb: "The big aggregators. Codes here are usually for the retailer (Best Buy, Amazon, etc.) rather than the TV itself.",
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
    blurb: "Search the store itself — sale prices, clearance, open-box and bundle offers show up here first.",
    items: [
      { name: "Sony Store (if Sony product)", url: "https://electronics.sony.com/tv-video/televisions/c/all-tvs?q={q}", top: true },
      { name: "Sony Certified Refurbished", url: "https://electronics.sony.com/refurbished/c/refurbished" },
      { name: "Best Buy", url: "https://www.bestbuy.com/site/searchpage.jsp?st={q}&sp=-currentprice%20skuidsaas", top: true },
      { name: "Best Buy Open-Box", url: "https://www.bestbuy.com/site/searchpage.jsp?st={q}&qp=condition_facet%3DCondition~Open-Box&sp=-currentprice%20skuidsaas" },
      { name: "Best Buy Outlet", url: "https://www.bestbuy.com/site/misc/deal-of-the-day/pcmcat248000050016.c?id=pcmcat248000050016" },
      { name: "Amazon", url: "https://www.amazon.com/s?k={q}&s=price-asc-rank", top: true },
      { name: "Amazon Warehouse (used/open-box)", url: "https://www.amazon.com/s?k={q}&rh=p_n_condition-type%3A6461716011&s=price-asc-rank" },
      { name: "Walmart", url: "https://www.walmart.com/search?q={q}&sort=price_low" },
      { name: "Target", url: "https://www.target.com/s?searchTerm={q}&sortBy=PriceLow" },
      { name: "Costco", url: "https://www.costco.com/CatalogSearch?keyword={q}" },
      { name: "Sam's Club", url: "https://www.samsclub.com/s/{q}" },
      { name: "B&H Photo", url: "https://www.bhphotovideo.com/c/search?q={q}&sort=PRICE_LOW_TO_HIGH" },
      { name: "Adorama", url: "https://www.adorama.com/l/?searchinfo={q}" },
      { name: "Abt Electronics", url: "https://www.abt.com/resources/pages/search.php?keywords={q}" },
      { name: "Crutchfield", url: "https://www.crutchfield.com/search.aspx?search={q}" },
      { name: "Newegg", url: "https://www.newegg.com/p/pl?d={q}&Order=1" },
      { name: "eBay (Sony official outlet too)", url: "https://www.ebay.com/sch/i.html?_nkw={q}&LH_ItemCondition=1000%7C1500%7C2000%7C2500&_sop=15" },
      { name: "Woot (Amazon deals)", url: "https://www.woot.com/search?query={q}" }
    ]
  },
  {
    category: "💸 Cashback Portals (stack on top of codes)",
    blurb: "Activate before you buy. Cashback stacks with coupon codes and sale prices.",
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
    blurb: "Real people posting real codes, often before coupon sites catch them.",
    items: [
      { name: "Slickdeals", url: "https://slickdeals.net/newsearch.php?q={q}&searcharea=deals", top: true },
      { name: "Reddit r/deals", url: "https://www.reddit.com/r/deals/search/?q={q}&restrict_sr=1&sort=new" },
      { name: "Reddit r/buildapcsales (TVs)", url: "https://www.reddit.com/r/buildapcsales/search/?q={q}&restrict_sr=1&sort=new" },
      { name: "Reddit r/bravia", url: "https://www.reddit.com/r/bravia/search/?q=deal+{q}&restrict_sr=1&sort=new" },
      { name: "Reddit r/4kTV", url: "https://www.reddit.com/r/4kTV/search/?q={q}&restrict_sr=1&sort=new" },
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
      { name: "Google: student / military discount", url: "https://www.google.com/search?q=Sony+TV+student+OR+military+OR+education+discount" },
      { name: "Google News: Sony TV deals", url: "https://news.google.com/search?q=Sony+TV+deal+OR+sale" },
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
      { name: "Sony Education Store (students/teachers)", url: "https://electronics.sony.com/education-store" },
      { name: "Sony Military & First Responder (via ID.me)", url: "https://www.id.me/shop/sony" },
      { name: "Best Buy Student Deals", url: "https://www.bestbuy.com/site/misc/student-deals/pcmcat276200050000.c?id=pcmcat276200050000" },
      { name: "Best Buy Price Match Guarantee", url: "https://www.bestbuy.com/site/help-topics/price-match-guarantee/pcmcat297300050000.c?id=pcmcat297300050000" },
      { name: "Amazon Price Match / Deals page", url: "https://www.amazon.com/deals" },
      { name: "Costco Warehouse Savings", url: "https://www.costco.com/warehouse-savings.html" },
      { name: "Target Circle Offers", url: "https://www.target.com/circle" },
      { name: "Walmart Flash Deals", url: "https://www.walmart.com/shop/deals/flash-deals" }
    ]
  }
];
