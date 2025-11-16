// src/utils/responseHandler.js

module.exports = {
  success: (data = {}, message = 'Success') => {
    return {
      success: true,
      message,
      ...data
    };
  },

  error: (err = {}, message = 'Something went wrong') => {
    const errorMessage = err?.message || message;
    return {
      success: false,
      message: errorMessage,
      error: err
    };
  }
};
