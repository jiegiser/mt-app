import passport from 'koa-passport'
import LocalStrategy from 'passport-local'
import UserModel from '../../dbs/models/users'

// passport passport.js是Nodejs中的一个做登录验证的中间件，极其灵活和模块化，
// LocalStrategy是passport的一个本地策略

// done回调函数
passport.use(
  new LocalStrategy(async function(username, password, done) {
    let where = {
      username
    }
    //   找到之后就返回
    let result = await UserModel.findOne(where)
    if (result != null) {
      //   判断用户输入的密码与数据库中存储的密码
      if (result.password === password) {
        return done(null, result)
      } else {
        return done(null, false, '密码错误')
      }
    } else {
      return done(null, false, '用户不存在')
    }
  })
)
// 让用户每次进来的时候，都自动的通过session进行验证，可以做一个序列化的操作
passport.serializeUser(function(user, done) {
  done(null, user)
})
// 反序列化
passport.deserializeUser(function(user, done) {
  return done(null, user)
})

export default passport
