import axios from 'axios'

// create就是创建一个实例
const instance = axios.create({
    // process.env.HOST这个没有设置就取localhost
  baseURL:`http://${process.env.HOST||'localhost'}:${process.env.PORT||3000}`,
//   超时
  timeout:2000,
  headers:{

  }
})

export default instance
