// 复现：同一种超时配置，两家适配器给出来的文案不一样
import http from "node:http";
import axios from "../index.js";

const server = http.createServer(() => {}); // 永不响应

server.listen(0, async () => {
  const url = `http://127.0.0.1:${server.address().port}/hang`;
  for (const adapter of ["http", "fetch"]) {
    try {
      await axios.get(url, {
        adapter,
        timeout: 120,
        timeoutErrorMessage: "自定义超时文案",
        transitional: { clarifyTimeoutError: true },
      });
      console.log(adapter, "-> 没超时？");
    } catch (e) {
      console.log(adapter.padEnd(5), "code=" + e.code, "| msg=" + JSON.stringify(String(e.message)));
    }
    try {
      await axios.get(url, { adapter, timeout: 120 });
    } catch (e) {
      console.log("     只给 timeout 时:", "code=" + e.code, "| msg=" + JSON.stringify(String(e.message)));
    }
  }
  server.close();
});
