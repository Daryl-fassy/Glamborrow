//Slide through pictures functions
import { products } from "./products-data.js";
import { RentalPrice } from "./priceFunctions.js";
import { BuyPrice } from "./priceFunctions.js";

export function slidePictures() {
  function slide(productId) {
    let nextbutton = document.querySelectorAll('.js-slidebuttonprevious');
    let previousbutton = document.querySelectorAll('.js-slidebuttonnext');
    let currentIndex = 0;

    nextbutton.forEach((button) => {
      button.addEventListener('click', () => {
        const productWithAlbum = products.find(p => p.id === productId);
        if (!productWithAlbum || !productWithAlbum.album) return;

        const pictures = productWithAlbum.album.pictures;
        currentIndex = (currentIndex + 1) % pictures.length;

        const picture = pictures[currentIndex];
        document.querySelector('.js-productimgdiv').innerHTML =
          `<img class="productimgdiv" src="${picture}" alt="Product">
           <span class="imgCount">${currentIndex + 1} / ${pictures.length}</span>`;
      });
    });

    previousbutton.forEach((button) => {
      button.addEventListener('click', () => {
        const productWithAlbum = products.find(p => p.id === productId);
        if (!productWithAlbum || !productWithAlbum.album) return;

        const pictures = productWithAlbum.album.pictures;
        currentIndex = (currentIndex - 1 + pictures.length) % pictures.length;

        const picture = pictures[currentIndex];
        document.querySelector('.js-productimgdiv').innerHTML =
          `<img class="productimgdiv" src="${picture}" alt="Product">
           <span class="imgCount">${currentIndex + 1} / ${pictures.length}</span>`;
      });
    });
  }

  document.querySelectorAll(".js-picdiv").forEach((picdiv) => {
    picdiv.addEventListener("click", () => {
      let productId = picdiv.dataset.producttoViewId;
      let product = products.find(p => p.id === productId);

      if (!product) {
        console.error("Product not found for ID:", productId);
        return;
      }

      // Handle rent section safely
      let rentSectionHtml = "";
      if (product.rentalStatus === "available") {   // <-- boolean flag in product data
        rentSectionHtml = `
          <div class="rent-section">
            <button class="Rentbutton js-rentbutton" data-event="Rent">Rent</button>
            <p class="rentPriceDisplay">R${RentalPrice(product.price)}</p>
          </div>
        `;
      } else {
        rentSectionHtml = `
          <div class="rent-section">
            <p class="rentUnavailable">This item cannot be rented</p>
          </div>
        `;
      }

      document.querySelector(".js-products-grid").innerHTML = `
        <div class="Headerflex">
          <div class="forGlambadge"> 
            <img class="Glambadge" src="icons/glamborrow-logo.jpeg">
          </div>
        </div>
        <div class="productinformation">
          <div class="pictureandbuttons">
            <div><button class="backbutton js-slidebuttonnext">&lt;&lt;</button></div>
            <div class="productimgdiv js-productimgdiv">
              <img class="productimgdiv" src="${product.image}" alt="Product">
            </div>
            <div><button class="backbutton js-slidebuttonprevious">&gt;&gt;</button></div>
          </div>
          <div class="productdetails">
            <h2 class="productnameHeader">${product.name}</h2>
            <p class="itemDiscription">${product.description}</p>

            <div class="options-section">
              <div class="color-section">
                <button class="optionbutton js-colorbutton">View Colors</button>
                <div class="colorOptionsWindow js-colorOptionsWindow"></div>
              </div>
              <div class="size-section">
                <button class="optionbutton js-sizebutton">View Sizes</button>
                <div class="sizeOptionsWindow js-sizeOptionsWindow"></div>
              </div>
            </div>

            <div class="event-section">
              ${rentSectionHtml}
              <div class="buy-section">
                <button class="Buybutton js-buybutton" data-event="Buy">Buy</button>
                <p class="buyPriceDisplay">R${BuyPrice(product.price)}</p>
              </div>
            </div>

            <div class="confirm-section">
              <button class="Confirmbutton js-confirmbutton" data-product-id="${productId}">
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      `;

      slide(productId);
      ColorButtonFunctions(productId);
      SizeButtonFunctions(productId);
      EventButtonFunctions(productId);
      ConfirmButtonFunctions(productId);
    });
  });
}

// Color options
function ColorButtonFunctions(productId) {
  let colorbutton = document.querySelector('.js-colorbutton');
  let colorWindow = document.querySelector('.js-colorOptionsWindow');

  if (!colorbutton) return;

  colorbutton.addEventListener('click', () => {
    if (colorWindow.innerHTML.trim() !== '') {
      colorWindow.innerHTML = '';
      return;
    }
    const productColor = products.find(p => p.id === productId).album.colour;
    const optionsHtml = productColor.map(color =>
      `<option value="${color}">${color}</option>`
    ).join('');

    colorWindow.innerHTML = `
      <label for="Color">Choose Color</label>
      <select id="Color" name="Color" class="js-selectedColor">
        ${optionsHtml}
      </select>
    `;
  });
}

// Size options
function SizeButtonFunctions(productId) {
  let sizebutton = document.querySelector('.js-sizebutton');
  let sizeWindow = document.querySelector('.js-sizeOptionsWindow');

  if (!sizebutton) return;

  sizebutton.addEventListener('click', () => {
    if (sizeWindow.innerHTML.trim() !== '') {
      sizeWindow.innerHTML = '';
      return;
    }
    const productSize = products.find(p => p.id === productId).size;
    const optionsHtml = productSize.map(size =>
      `<option value="${size}">${size}</option>`
    ).join('');

    sizeWindow.innerHTML = `
      <label for="Size">Choose Size</label>
      <select id="Size" name="Size" class="js-selectedSize">
        ${optionsHtml}
      </select>
    `;
  });
}

// Event selection (Rent/Buy)
let selectedEvent = null;
function EventButtonFunctions(productId) {
  const rentBtn = document.querySelector('.js-rentbutton');
  const buyBtn = document.querySelector('.js-buybutton');

  if (rentBtn) {
    rentBtn.addEventListener('click', () => {
      selectedEvent = 'Rent';
      console.log("Event selected:", selectedEvent);

      rentBtn.style.backgroundColor = 'gold';
      if (buyBtn) buyBtn.style.backgroundColor = '';
    });
  }

  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      selectedEvent = 'Buy';
      console.log("Event selected:", selectedEvent);

      buyBtn.style.backgroundColor = 'green';
      if (rentBtn) rentBtn.style.backgroundColor = '';
    });
  }
}

// Confirm button
function ConfirmButtonFunctions(productId) {
  let confirmBtn = document.querySelector('.js-confirmbutton');
  if (!confirmBtn) return;

  confirmBtn.addEventListener('click', () => {
    const selectedColor = document.querySelector('.js-selectedColor')?.value;
    const selectedSize = document.querySelector('.js-selectedSize')?.value;

    if (!selectedColor || !selectedSize || !selectedEvent) {
      alert("Please select a color, size, and whether you want to Rent or Buy before confirming.");
      return;
    }

    console.log("Confirm clicked for product:", productId);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Size:", selectedSize);
    console.log("Event:", selectedEvent);

    const product = products.find(p => p.id === productId);
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    let existingItem = cart.find(item =>
      item.id === productId &&
      item.color === selectedColor &&
      item.size === selectedSize &&
      item.event === selectedEvent
    );

    if (existingItem) {
      existingItem.Quantity += 1;
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: product.price,
        color: selectedColor,
        size: selectedSize,
        event: selectedEvent,
        Quantity: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    console.log("Cart updated:", cart);

    alert("Added to Cart!!");
  });
}
