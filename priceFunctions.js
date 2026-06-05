export function RentalPrice(RentingPrice){
  let halfPrice=RentingPrice*0.4;
  let interest=RentingPrice*0.02;
  let RentPriceTodisplay=halfPrice+interest;

 return RentPriceTodisplay;
};

export function BuyPrice(BuyingPrice){
  let interest=BuyingPrice*0.02;
  let BuyPriceToDisplay=BuyingPrice+interest;
  return BuyPriceToDisplay;
}