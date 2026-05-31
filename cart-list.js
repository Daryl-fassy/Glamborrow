import { products } from "./products-data.js";
import{cart,removeFromCart, updateCart} from './cart.js';
import { slidePictures } from "./slidePicsFunctions.js";
import { RentalPrice} from "./priceFunctions.js";
import { BuyPrice } from "./priceFunctions.js";

function rendarCart(){
let cartlistHtml="";
let totalprice=0;

cart.forEach((cartiteam)=>{
const productId=cartiteam.id;

let matchingProduct;
    products.forEach((product)=>{
      if(product.id===productId){
       matchingProduct= product;
      }
    });
    let RentPrice=matchingProduct.price;
    if (cartiteam.event === 'Rent') {
  cartlistHtml += `
    <div class="iteamincartpage js-iteamincartpage-${matchingProduct.id}">
      <div class="picdiv">
        <img class="imgiteam" src=${matchingProduct.image}>
      </div>
      <div class="rentPriceAndRemoveButton-Div">
        <div class="iteamdiscription">
          <div>
            <p class="iteamheading">${matchingProduct.name}</p>
          </div>
        </div>
        <div class="quantity" data-quantity="${cartiteam.Quantity}">
          Quantity: ${cartiteam.Quantity}
        </div>
      </div>
      <div class="rentPriceAndRemoveButton-Div">
        <div class="rentprice">
          R${RentalPrice(matchingProduct.price).toFixed(2)}
        </div>
        <div>
          <button class="removebutton js-remove-button" data-product-id="${matchingProduct.id}">Remove</button>
        </div>
      </div>
        <p style="font-family: Roboto ; color: #ffffff;">TO: ${cartiteam.event}</p>
    </div>
  `;
  totalprice += RentalPrice(matchingProduct.price) * cartiteam.Quantity;
} else {
  cartlistHtml += `
    <div class="iteamincartpage js-iteamincartpage-${matchingProduct.id}">
      <div class="picdiv">
        <img class="imgiteam" src=${matchingProduct.image}>
      </div>
      <div class="rentPriceAndRemoveButton-Div">
        <div class="iteamdiscription">
          <div>
            <p class="iteamheading">${matchingProduct.name}</p>
          </div>
        </div>
        <div class="quantity" data-quantity="${cartiteam.Quantity}">
          Quantity: ${cartiteam.Quantity}
        </div>
      </div>
      <div class="rentPriceAndRemoveButton-Div">
        <div class="rentprice">
          R${BuyPrice(matchingProduct.price).toFixed(2)}
        </div>
        <div>
          <button class="removebutton js-remove-button" data-product-id="${matchingProduct.id}">Remove</button>
        </div>
      </div>
      <p style="font-family: Roboto; color: #ffffff;">TO: ${cartiteam.event}</p>
    </div>
  `;
  totalprice += BuyPrice(matchingProduct.price) * cartiteam.Quantity;
}console.log(cart)
console.log(cartiteam.event)
console.log()

 
   });
    slidePictures();
   document.querySelector('.js-products-grid').innerHTML = cartlistHtml;
   document.querySelector('.js-rent-total-price').innerHTML = `The total price: R${totalprice.toFixed(2)}`;
   
   document.querySelectorAll(".js-remove-button").forEach((button)=>{
    button.addEventListener("click",()=>{
    const productIdToRemove=button.dataset.productId;
    removeFromCart(productIdToRemove);
    document.querySelector(`.js-iteamincartpage-${productIdToRemove}`).remove();
     rendarCart();
    });
  });
};

rendarCart();
export {rendarCart};
