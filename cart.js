export let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCartToLocalStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function addtocart(button) {
  const productToCart = button.dataset.rentProductId;
  let matchingProducts;

  cart.forEach((cartiteam) => {
    if (productToCart === cartiteam.id) {
      matchingProducts = cartiteam;
    }
  });

  if (matchingProducts) {
    matchingProducts.Quantity += 1;
  } else {
    cart.push({
      id: productToCart,
      Quantity: 1,
      Event: "Rent",
    });
  }
  saveCartToLocalStorage();
}

export function updateCart() {
  let cartQuantity = 0;
  cart.forEach(item => {
    cartQuantity += item.Quantity;
  });
  document.querySelector(".js-cart-quantity").innerHTML = cartQuantity;
  saveCartToLocalStorage();
}

export function removeFromCart(productIdToRemove) {
  cart = cart.filter(cartItem => cartItem.id !== productIdToRemove);
  saveCartToLocalStorage();
}