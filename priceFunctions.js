export function RentalPrice(RentingPrice){
  let halfPrice = RentingPrice * 0.45;
  let interest = RentingPrice * 0.02;
  let RentPriceTodisplay = halfPrice + interest;

  return parseFloat(RentPriceTodisplay.toFixed(2));
};

export function BuyPrice(BuyingPrice){
  let interest = BuyingPrice * 0.02;
  let BuyPriceToDisplay = BuyingPrice + interest;

  return parseFloat(BuyPriceToDisplay.toFixed(2));
}