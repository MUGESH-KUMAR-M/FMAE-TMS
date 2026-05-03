// Backend validation functions

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9\-\+\(\)\s]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
};

const validateAssetCode = (code) => {
  return /^[A-Z0-9\-]+$/.test(code);
};

const validateDate = (date) => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

const validateCost = (cost) => {
  return !isNaN(parseFloat(cost)) && isFinite(cost) && cost >= 0;
};

module.exports = {
  validateEmail,
  validatePhone,
  validateAssetCode,
  validateDate,
  validateCost,
};
