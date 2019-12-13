
module.exports = {
  devServer: {
    proxy: {
      "/api/*": {
        target: "http://localhost:5000"
      },
      "/public-api/*": {
        target: "http://localhost:5000"
      },
      "/webhook/*": {
        target: "http://localhost:5000"
      },
      "/upload/*": {
        target: "http://localhost:5000"
      }
    },
    allowedHosts: [
      '.ngrok.io'
    ]
  }
};
