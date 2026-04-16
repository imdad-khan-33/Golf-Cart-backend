import Cart from '../models/Cart.js';
import { AppError } from '../middleware/errorHandler.js';
import { formatCartResponse, formatCartsResponse } from '../utils/cartFormatter.js';

// @desc    Get all carts
// @route   GET /api/carts
// @access  Public
export const getAllCarts = async (req, res, next) => {
  try {
    const carts = await Cart.find({ availability: true }).sort('price');

    res.status(200).json({
      success: true,
      count: carts.length,
      carts: formatCartsResponse(carts)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single cart by ID
// @route   GET /api/carts/:id
// @access  Public
export const getCartById = async (req, res, next) => {
  try {
    const cart = await Cart.findById(req.params.id);

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    res.status(200).json({
      success: true,
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get carts by type
// @route   GET /api/carts/type/:name
// @access  Public
export const getCartsByType = async (req, res, next) => {
  try {
    const { name } = req.params;

    const validTypes = ['Normal', 'Economy', 'Comfort'];
    if (!validTypes.includes(name)) {
      throw new AppError(`Cart type must be one of: ${validTypes.join(', ')}`, 400);
    }

    const carts = await Cart.find({ name, availability: true });

    res.status(200).json({
      success: true,
      count: carts.length,
      carts: formatCartsResponse(carts)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new cart (Admin)
// @route   POST /api/carts
// @access  Private/Admin
export const createCart = async (req, res, next) => {
  try {
    const { name, seats, estimatedDuration, price, isPopular, description, image, features, quantity } = req.body;

    // Validation
    if (!name || !seats || !estimatedDuration || !price) {
      throw new AppError('Please provide all required fields (name, seats, estimatedDuration, price)', 400);
    }

    const validTypes = ['Normal', 'Economy', 'Comfort'];
    if (!validTypes.includes(name)) {
      throw new AppError(`Cart type must be one of: ${validTypes.join(', ')}`, 400);
    }

    if (price < 0 || seats < 1 || estimatedDuration < 1) {
      throw new AppError('Price, seats, and duration must be positive numbers', 400);
    }

    const cart = await Cart.create({
      name,
      seats,
      estimatedDuration,
      price,
      isPopular: isPopular || false,
      description: description || '',
      image: image || '',
      features: features || [],
      quantity: quantity || 1
    });

    res.status(201).json({
      success: true,
      message: 'Cart created successfully',
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart (Admin)
// @route   PUT /api/carts/:id
// @access  Private/Admin
export const updateCart = async (req, res, next) => {
  try {
    const { name, seats, estimatedDuration, price, isPopular, description, image, features, availability, quantity } = req.body;

    let cart = await Cart.findById(req.params.id);

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Update fields
    if (name) cart.name = name;
    if (seats) cart.seats = seats;
    if (estimatedDuration) cart.estimatedDuration = estimatedDuration;
    if (price !== undefined) cart.price = price;
    if (isPopular !== undefined) cart.isPopular = isPopular;
    if (description !== undefined) cart.description = description;
    if (image) cart.image = image;
    if (features) cart.features = features;
    if (availability !== undefined) cart.availability = availability;
    if (quantity) cart.quantity = quantity;

    cart = await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete cart (Admin)
// @route   DELETE /api/carts/:id
// @access  Private/Admin
export const deleteCart = async (req, res, next) => {
  try {
    const cart = await Cart.findByIdAndDelete(req.params.id);

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Cart deleted successfully',
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};
