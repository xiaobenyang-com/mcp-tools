WORKDIR /app
RUN (npm install)
CMD ["node","src/test_stdio_list.js"]
