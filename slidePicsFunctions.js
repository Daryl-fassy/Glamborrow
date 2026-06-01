// slidePicsFunctions.js
// Listens for product card clicks and navigates to slideFunction.html?id=PRODUCT_ID.

export function slidePictures() {
  document.querySelectorAll(".js-picdiv").forEach((picdiv) => {
    picdiv.addEventListener("click", () => {
      // The DOM lowercases all attributes, so data-productTO-View-id
      // and data-productto-view-id both become dataset.producttoViewId
      const productId = picdiv.dataset.producttoViewId;

      if (!productId) {
        console.error("slidePictures: missing data-productto-view-id on", picdiv);
        return;
      }

      window.location.href = `slideFunction.html?id=${encodeURIComponent(productId)}`;
    });
  });
}
