// vite.config.js
module.exports = {
  root: "./src", // root directory of the project
  base: "./", // base path for the project
  build: {
    outDir: "dist",
  },
  server: {
    open: true, // automatically open the browser
    cors: true, // enable CORS
  },
};
