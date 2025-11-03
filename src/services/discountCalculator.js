function calculateDiscount(total) {
  let discountPercent = 0;

  if (total > 1000) {
    discountPercent = 7;
  } else if (total > 500) {
    discountPercent = 5;
  } else if (total > 200) {
    discountPercent = 2;
  }
  const rawDiscount = (total * discountPercent) / 100;

  const discount =
    rawDiscount % 1 < 0.5 ? Math.floor(rawDiscount) : Math.ceil(rawDiscount);
  const final = total - discount;
  return {
    discountPercent,
    discount,
    final,
  };
}
module.exports = { calculateDiscount };
