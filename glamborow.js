import { products } from "./products-data.js";
import { cart,addtocart,updateCart } from "./cart.js";
import { slidePictures } from "./slidePicsFunctions.js";
import { RentalPrice} from "./priceFunctions.js";
import { BuyPrice } from "./priceFunctions.js";

// ✅ Shuffle products every 1 hour, even when the site is not being used
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const SHUFFLE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

function checkAndShuffle() {
  const lastShuffle = parseInt(localStorage.getItem("lastShuffleTime") || "0", 10);
  const now = Date.now();
  if (now - lastShuffle >= SHUFFLE_INTERVAL_MS) {
    shuffleArray(products);
    localStorage.setItem("lastShuffleTime", now.toString());
  }
}

// Run on page load
checkAndShuffle();

// Keep reshuffling every hour even while the page stays open
setInterval(() => {
  shuffleArray(products);
  localStorage.setItem("lastShuffleTime", Date.now().toString());
  // Re-render the grid with the new order
  document.querySelector(".js-products-grid").innerHTML = productsHtml;
  attachButtonListeners();
  slidePictures();
}, SHUFFLE_INTERVAL_MS);

// ✅ Clear cart after successful payment + save order to history
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("paymentSuccess") === "true") {
  localStorage.removeItem("cart");
  localStorage.removeItem("lastOrder");

  // ✅ Save order to history from frontend's localStorage (correct origin)
  const orderParam = urlParams.get("order");
  if (orderParam) {
    try {
      const order = JSON.parse(decodeURIComponent(orderParam));
      const history = JSON.parse(localStorage.getItem("orderHistory")) || [];
      const alreadySaved = history.some(o => o.orderId === order.orderId);
      if (!alreadySaved) {
        history.unshift(order);
        if (history.length > 20) history.pop();
        localStorage.setItem("orderHistory", JSON.stringify(history));
        console.log("✅ Order saved to history:", order.orderId);
      }
    } catch (err) {
      console.error("Failed to save order history:", err);
    }
  }

  // Clean URL then reload so cart.js re-reads empty localStorage
  window.history.replaceState({}, document.title, window.location.pathname);
  window.location.reload();
}


function attachButtonListeners() {
  document.querySelectorAll(".js-rentbutton").forEach((button) => {
    button.addEventListener("click", () => {
      Addtext();
      addtocart(button);
      updateCart();
    });
  })
};
let productsHtml = "";

products.forEach((product) => {
  let RentPrice = product.price;

  if (
    product.Producttype === "nails" ||
    product.Producttype === "earings" ||
    product.Producttype === "necklaces" ||
    product.Producttype === "accesories" ||
    product.Producttype === "handbags" ||
    product.Producttype === "hats" ||
    product.Producttype === "shades"
  ) {
    productsHtml += `
      <div class="iteam">
        <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
          <img class="imgiteam" src="${product.image}">
        </div>
        <div class="iteamdiscription">
          <p class="iteamheading">${product.name}</p>
          <div class="Pricediv">
            <div style="border-right: 1px solid gray; width: 80px;">
              <p style="font-weight: bold; padding-left: 30px;">Buy</p>
              <p class="Buyprice">R${BuyPrice(product.price)}</p>
            </div>
          </div>
          <div class="rentbuydiv">
            <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
          </div>
        </div>
      </div>
    `;
  } else {
    productsHtml += `
      <div class="iteam">
        <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
          <img class="imgiteam" src="${product.image}">
        </div>
        <div class="iteamdiscription">
          <p class="iteamheading">${product.name}</p>
          <div class="Pricediv">
            <div style="border-right: 1px solid gray; width: 80px;">
              <p style="font-weight: bold; padding-right: 40px;">Rent</p>
              <p class="Rentprice">R${RentalPrice(RentPrice)}</p>
            </div>
            <div>
              <p style="font-weight: bold; padding-left: 40px;">Buy</p>
              <p class="Buyprice">R${BuyPrice(product.price)}</p>
            </div>
          </div>
          <div class="rentbuydiv">
            <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
          </div>
        </div>
      </div>
    `;
  }
});

document.querySelector(".js-products-grid").innerHTML = productsHtml;
attachButtonListeners();

// ✅ Update cart immediately — works on mobile where DOMContentLoaded
// may fire before the module runs, causing stale quantity display.
updateCart();

// ✅ Listen for localStorage changes made by OTHER pages (e.g. slideFunction.html).
// On mobile, returning from a product page doesn't trigger a reload, so without
// this the cart badge stays stale until the user manually refreshes.
window.addEventListener("storage", (event) => {
  if (event.key === "cart") {
    updateCart();
  }
});

function Addtext() {
  const container = document.querySelector('.js-addedtocartdiv');
  container.innerHTML = `
    <img class="addedtocartimg" src=icons/bright-green-tick-checkmark-icon-free-png.webp>
    <span class="addedtocarttext">Added to cart</span>
  `;
  setTimeout(() => {
    container.innerHTML = "";
  }, 2000);
};

let inputvalue = "";
const searchbar = document.querySelector('.js-searchbar');
const searchbutton = document.querySelector('.js-searchbutton');

searchbar.addEventListener('input', () => {
  inputvalue = searchbar.value.toLowerCase();
  if (!inputvalue) {
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    attachButtonListeners();
    slidePictures();
    return;
  }
  const results = products.filter(product =>
    product.name.toLowerCase().includes(inputvalue)
  );
  console.log("Search results:", results);
});

function runSearch() {
  if (!inputvalue) {
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    return;
  }

  let productsToApearHtml = '';

  products.forEach(product => {
    if (product.Producttype.toLowerCase().includes(inputvalue)) {
      if (
        product.Producttype === "nails" ||
        product.Producttype === "earings" ||
        product.Producttype === "necklaces" ||
        product.Producttype === "accesories" ||
        product.Producttype === "handbags" ||
        product.Producttype === "hats" ||
        product.Producttype === "shades"
      ) {
        productsToApearHtml += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      } else {
        productsToApearHtml += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                  <p class="Rentprice">R${RentalPrice(product.price)}</p>
                </div>
                <div>
                  <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  if (productsToApearHtml) {
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml;
    attachButtonListeners();
    slidePictures();
  } else {
    document.querySelector(".js-products-grid").innerHTML = `
      <p style="font-weight:bold; color:white;">
        Sorry, couldn't find your product.<br>
        Try using the filter button for more accurate results.
      </p>
      <img src="icons/OIP.webp">
    `;
  }
}

searchbutton.addEventListener('click', runSearch);
searchbar.addEventListener('keydown', (event) => {
  if (event.key === "Enter") {
    runSearch();
  }
});

//////////////////// Filter button function
document.querySelector(".js-filterbutton").addEventListener('click', () => {
  const popspace = document.querySelector('.js-popspace');
  if (popspace.innerHTML.trim() !== "") {
    popspace.innerHTML = "";
    return;
  }
  popspace.innerHTML = `
    <span class="pop">
      <div><button class="producttypebutton" onclick="oneTimeSelection('suits')">Suits</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('dress')">Dresses</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('heels')">Heels</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('frontals')">Frontals</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('shoes')">Shoes</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('earings')">Earings</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('nails')">Nails</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('necklaces')">Necklaces</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('accesories')">Accesories</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('handbags')">Handbags</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('hats')">Hats</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('shades')">Shades</button></div>
      <div><button class="Applyfilterbutton" onclick="Applyfilter()">Apply Filter</button></div>
    </span>
  `;
});

let filterlist = [];
console.log(filterlist);

function oneTimeSelection(item) {
  const index = filterlist.indexOf(item);
  if (index === -1) {
    filterlist.push(item);
  } else {
    filterlist.splice(index, 1);
  }
  console.log(filterlist);
  const button = document.querySelector(`button[onclick="oneTimeSelection('${item}')"]`);
  if (button) {
    button.classList.toggle("selected");
  }
};
window.oneTimeSelection = oneTimeSelection;

let productsToApearHtml2 = "";
let productsToApear2 = "";

function Applyfilter() {
  let productsToApearHtml2 = "";
  products.forEach(product => {
    if (filterlist.includes(product.Producttype)) {
      if (
        product.Producttype === "nails" ||
        product.Producttype === "earings" ||
        product.Producttype === "necklaces" ||
        product.Producttype === "accesories" ||
        product.Producttype === "handbags" ||
        product.Producttype === "hats" ||
        product.Producttype === "shades"
      ) {
        productsToApearHtml2 += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      } else {
        productsToApearHtml2 += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                  <p class="Rentprice">R${RentalPrice(product.price)}</p>
                </div>
                <div>
                  <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  if (productsToApearHtml2) {
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml2;
    attachButtonListeners();
    slidePictures();
  } else {
    document.querySelector(".js-products-grid").innerHTML = `
      <p style="font-weight:bold; color:white;">
        Sorry, couldn't find your product.<br>
        We suggest you use the filter button on the top right for more accurate results.
      </p>
      <img src="icons/OIP.webp">
    `;
  }
  if (!filterlist) {
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
  }
  document.querySelector('.js-popspace').innerHTML = "";
  filterlist = [];
};

window.Applyfilter = Applyfilter;
slidePictures();

// Premium and Budget button logic
let premiumActive = false;
let budgetActive = false;

const premiumBtn = document.querySelector('.js-premiumbudget');
const budgetBtn = document.querySelector('.js-budget');

premiumBtn.addEventListener('click', () => {
  if (!premiumActive) {
    if (budgetActive) {
      budgetBtn.style.backgroundColor = '';
      budgetBtn.style.color = '';
      budgetActive = false;
    }
    premiumBtn.style.backgroundColor = 'black';
    premiumBtn.style.color = 'white';

    let productsToApearHtml3 = "";
    products.forEach(product => {
      if (product.class === "Premium") {
        if (
          product.Producttype === "nails" ||
          product.Producttype === "earings" ||
          product.Producttype === "necklaces" ||
          product.Producttype === "accesories" ||
          product.Producttype === "handbags" ||
          product.Producttype === "hats" ||
          product.Producttype === "shades"
        ) {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        } else {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                    <p class="Rentprice">R${RentalPrice(product.price)}</p>
                  </div>
                  <div>
                    <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        }
      }
    });
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml3;
    attachButtonListeners();
    slidePictures();
    premiumActive = true;
  } else {
    premiumBtn.style.backgroundColor = '';
    premiumBtn.style.color = '';
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    attachButtonListeners();
    slidePictures();
    premiumActive = false;
  }
});

budgetBtn.addEventListener('click', () => {
  if (!budgetActive) {
    if (premiumActive) {
      premiumBtn.style.backgroundColor = '';
      premiumBtn.style.color = '';
      premiumActive = false;
    }
    budgetBtn.style.backgroundColor = 'black';
    budgetBtn.style.color = 'white';

    let productsToApearHtml3 = "";
    products.forEach(product => {
      if (product.class === "Budget") {
        if (
          product.Producttype === "nails" ||
          product.Producttype === "earings" ||
          product.Producttype === "necklaces" ||
          product.Producttype === "accesories" ||
          product.Producttype === "handbags" ||
          product.Producttype === "hats" ||
          product.Producttype === "shades"
        ) {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        } else {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                    <p class="Rentprice">R${RentalPrice(product.price)}</p>
                  </div>
                  <div>
                    <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        }
      }
    });
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml3;
    attachButtonListeners();
    slidePictures();
    budgetActive = true;
  } else {
    budgetBtn.style.backgroundColor = '';
    budgetBtn.style.color = '';
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    attachButtonListeners();
    slidePictures();
    budgetActive = false;
  }
});

// ====================================================
// ✅ PREVIOUS ORDERS PANEL
// ====================================================

// ✅ Orders button now navigates to the dedicated orders page
const ordersButton = document.querySelector(".js-orders-button");
ordersButton.addEventListener("click", () => {
  window.location.href = "orders.html";
});
