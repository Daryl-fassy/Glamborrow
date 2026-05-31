export function RentalPrice(RentingPrice){
  let halfPrice=RentingPrice*0.5;
  let interest=RentingPrice*0.05;
  let RentPriceTodisplay=halfPrice+interest;

 return RentPriceTodisplay;
};

export function BuyPrice(BuyingPrice){
  let interest=BuyingPrice*0.15;
  let BuyPriceToDisplay=BuyingPrice+interest;
  return BuyPriceToDisplay;
}