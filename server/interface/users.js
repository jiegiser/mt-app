import Router from 'koa-router';
import Redis from 'koa-redis'
import nodeMailer from 'nodemailer'
import User from '../dbs/models/users'
import Passport from './utils/passport'
import Email from '../dbs/config'
import axios from './utils/axios'

let router = new Router({
  prefix: '/users'
})

//redis客户端
let Store = new Redis().client

router.post('/signup', async (ctx) => {
  // 获取用户输入的数据，结构赋值，数据是在ctx.request.body
  const {
    username,
    password,
    email,
    code
  } = ctx.request.body;
  if (code) {
    // 获取到验证码。验证码是在获取的时候就存储到redis中，这里进行取出与用户输入的验证码进行比对
    // 跟指定的用户绑定验证码。
    const saveCode = await Store.hget(`nodemail:${username}`, 'code')
    // 获取到过期时间（不想让验证码无限有效）
    const saveExpire = await Store.hget(`nodemail:${username}`, 'expire')
    // 判断传入的验证码与存储的对比
    if (code === saveCode) {
      //   过期时间大于现在的时间，就过期
      if (new Date().getTime() - saveExpire > 0) {
        ctx.body = {
          code: -1,
          msg: '验证码已过期，请重新尝试'
        }
        return false
      }
    } else {
      ctx.body = {
        code: -1,
        msg: '请填写正确的验证码'
      }
    }
  } else {
    //   拦截，没有输入验证码
    ctx.body = {
      code: -1,
      msg: '请填写验证码'
    }
  }
  //   查询用户，是否存在
  let user = await User.find({
    username
  })
  if (user.length) {
    ctx.body = {
      code: -1,
      msg: '已被注册'
    }
    return
  }
  //   创建一个用户 -直接插入数据
  let nuser = await User.create({
    username,
    password,
    email
  })
  if (nuser) {
    let res = await axios.post('/users/signin', {
      username,
      password
    })
    if (res.data && res.data.code === 0) {
      ctx.body = {
        code: 0,
        msg: '注册成功',
        user: res.data.user
      }
    } else {
      ctx.body = {
        code: -1,
        msg: 'error'
      }
    }
  } else {
    ctx.body = {
      code: -1,
      msg: '注册失败'
    }
  }
})
// 登录接口
router.post('/signin', async (ctx, next) => {
  // local策略
  return Passport.authenticate('local', function (err, user, info, status) {
    if (err) {
      ctx.body = {
        code: -1,
        msg: err
      }
    } else {
      if (user) {
        ctx.body = {
          code: 0,
          msg: '登录成功',
          user
        }
        // 一个登录的动作
        return ctx.login(user)
      } else {
        //   登录异常
        ctx.body = {
          code: 1,
          msg: info
        }
      }
    }
  })(ctx, next)
})
// 验证码验证接口
router.post('/verify', async (ctx, next) => {
  let username = ctx.request.body.username
  //   获取验证码过期时间
  const saveExpire = await Store.hget(`nodemail:${username}`, 'expire')
  //   限制
  if (saveExpire && new Date().getTime() - saveExpire < 0) {
    ctx.body = {
      code: -1,
      msg: '验证请求过于频繁，1分钟内1次'
    }
    return false
  }
  //   
  let transporter = nodeMailer.createTransport({
    service: 'qq',
    // 验证
    auth: {
      user: Email.smtp.user,
      pass: Email.smtp.pass
    }
  })
  //   设置发送内容
  let ko = {
    //   验证码
    code: Email.smtp.code(),
    // 设置过期时间
    expire: Email.smtp.expire(),
    // 接收人的邮箱
    email: ctx.request.body.email,
    // 用哪个用户名给对应用户发邮件
    user: ctx.request.body.username
  }
  //   邮件中显示的内容
  let mailOptions = {
    from: `"认证邮件" <${Email.smtp.user}>`, // 发送方
    to: ko.email, //接收方
    subject: '《慕课网高仿美团网全栈实战》注册码',
    html: `您在《慕课网高仿美团网全栈实战》课程中注册，您的邀请码是${ko.code}`
  }
  //   发送邮件
  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      // 发送失败
      return console.log(error)
    } else {
      // 存储用户、验证码、过期时间、邮箱
      Store.hmset(`nodemail:${ko.user}`, 'code', ko.code, 'expire', ko.expire, 'email', ko.email)
    }
  })
  ctx.body = {
    code: 0,
    msg: '验证码已发送，可能会有延时，有效期1分钟'
  }
})
// 退出
router.get('/exit', async (ctx, next) => {
  // 退出的动作
  await ctx.logout()
  // 检查-是否为成功注销状态
  if (!ctx.isAuthenticated()) {
    ctx.body = {
      code: 0
    }
  } else {
    ctx.body = {
      code: -1
    }
  }
})
// 获取用户信息
router.get('/getUser', async (ctx) => {
    // 判断用户是否登录状态
  if (ctx.isAuthenticated()) {
    //   从session中读取到用户信息
    const {
      username,
      email
    } = ctx.session.passport.user
    // 给客户端返回数据
    ctx.body = {
      user: username,
      email
    }
  } else {
    ctx.body = {
      user: '',
      email: ''
    }
  }
})

export default router
