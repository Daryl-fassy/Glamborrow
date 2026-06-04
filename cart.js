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
  // Read fresh from localStorage every time — the module-level `cart` array
  // can be stale if slideFunction.js wrote to localStorage directly.
  const freshCart = JSON.parse(localStorage.getItem('cart')) || [];
  let cartQuantity = 0;
  freshCart.forEach(item => {
    cartQuantity += item.Quantity;
  });
  const badge = document.querySelector(".js-cart-quantity");
  if (badge) badge.innerHTML = cartQuantity;
  // ⚠️ Do NOT call saveCartToLocalStorage() here — that would overwrite good
  // localStorage data with the stale module-level array.
}

export function removeFromCart(productIdToRemove) {
  cart = cart.filter(cartItem => cartItem.id !== productIdToRemove);
  saveCartToLocalStorage();
}
