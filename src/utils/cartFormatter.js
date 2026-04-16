// Format cart response (remove unnecessary fields)
export const formatCartResponse = (cart) => {
  const cartObj = cart.toObject ? cart.toObject() : cart;
  
  return {
    _id: cartObj._id,
    name: cartObj.name,
    seats: cartObj.seats,
    estimatedDuration: cartObj.estimatedDuration,
    price: cartObj.price,
    isPopular: cartObj.isPopular,
    description: cartObj.description,
    image: cartObj.image,
    features: cartObj.features,
    availability: cartObj.availability,
    quantity: cartObj.quantity
  };
};

// Format array of carts
export const formatCartsResponse = (carts) => {
  return carts.map(cart => formatCartResponse(cart));
};
