const express = require('express');
const {auth} = require('../controllers/authorization')
const { googleOauth } = require('../controllers/authenticate');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const passport = require('passport');
const { UserModel } = require('../models/usermodel');
const { client } = require('../configs/redis');
const { transporter } = require('../controllers/nodemailer')
const sgMail = require("@sendgrid/mail");
require('../configs/googleOauth');

const patientRouter = express.Router();

patientRouter.get('/allPatient', async(req,res)=>{
    try {
        let list = await UserModel.find();
        res.status(200).send(list);
      } catch (err) {
        console.log('error',err.message);
        res.status(500).send({msg: err.message});
      }
})

patientRouter.post("/register", async (req, res) => {
    const { name, email, password, age } = req.body

    try {
        isUserPresent = await UserModel.findOne({ email })
        if (isUserPresent) {
            return res.send({ "msg": "Login Directly" })
        }

        bcrypt.hash(password, 5, async (err, hash) => {
            const user = new UserModel({ name, email, password: hash, age })
            await user.save()
            res.status(201).send({ "msg": "Registration Succesfull" })
        });
    } catch (error) {
        res.status(401).send({ "msg": error.message })

    }

})


patientRouter.post("/login", async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await UserModel.findOne({ email })
        if (user) {
            bcrypt.compare(password, user.password, function (err, result) {
                if (result) {
                    let accesstoken = jwt.sign({ "userID": user._id }, 'accesstoken', { expiresIn: "7d" });


                    res.status(201).send({ "msg": "login success", "token": accesstoken, "user":user })

                } else {
                    res.status(401).send({ "msg": "wrong input,login failed ,User already exist, please login" })
                }
            });
        } else {
            res.status(401).send({ "msg": "login failed,user is not present" })

        }
    } catch (error) {
        res.status(401).send({ "msg": "error occourd while login " })

    }
})

patientRouter.post("/logout", async (req, res) => {
    try {
        const foundToken = req.headers?.authorization
        const newBlackList = new BlackModel({ token: foundToken })
        await newBlackList.save()
        res.status(201).send({ "msg": "Logout SuccesFully" })
    } catch (error) {
        res.status(401).send({ "msg": error.message })
    }
});


// generate otp and send to client and also store it in redis.


// patientRouter.post("/sendmail",auth,async(req,res)=>{
//     const {userID,amount}=req.body;
//     try{
//         let user= await UserModel.findOne({_id:userID});
//         console.log(user);
//         const otp=Math.floor((Math.random()*1000000)+1);
//         await client.set(user.email,otp,"EX",15*60);
       
//         let mailOptions = {
//             from: 'smilecare.operation@gmail.com',
//             to: user.email,
//             subject: 'TRANSCTION OTP',
//             text: `YOUR OTP FOR PAYMENT OF RS ${amount} FOR FEES IN SMILE CARE IS : ${otp}
//             note:- This OTP is valid for only 15 minutes.`
//         };

//         transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 res.status(401).send({"error":"Internal server error"});
//             } else {
//                 res.status(200).send({"msg":"Email sent successfully"});
//             }
//         });

//     }catch(err){
//         res.status(401).send(err);
//     }
// });

// //verify otp from redis

// patientRouter.post("/verify",auth,async(req,res)=>{
//     try{
//         const {otp}=req.body;
//         const id=req.body.userID;
//         const user= await UserModel.findOne({_id:id});
//         // console.log(user);
//         const data= await client.get(user.email);
//         // console.log(data);
//         if(otp==data){
//             const {plan,price}=req.body;
//             const userdata= new PaidModel({plan,price});
//             await userdata.save();
//             res.status(200).send({"msg":true});
//         }else{
//             res.status(400).send({"msg":false});
//         }

//     }catch(err){
//         res.status(401).send({"error":err});
//     }
// })


//generating ranom OTP here
patientRouter.post("/generate", async (req, res) => {
    try {
      let { email } = req.body;
      console.log(email);
      sgMail.setApiKey(process.env.api_key);
  
      function generateOTP() {
        const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  
        let generatedOtp = "";
  
        for (let i = 0; i < 4; i++) {
          const index = Math.floor(Math.random() * digits.length);
  
          generatedOtp += digits[index];
        }
        return generatedOtp;
      }
  
      const otp = generateOTP();
  
      const msg = {
        to: email,
        from: "smilecare.operation@gmail.com",
        subject: "One Time Password",
        text: `Your OTP for payment to Smile Care is ${otp}`,
      };
      console.log(msg);
      sgMail.send(msg).then(
        () => {},
        (error) => {
          console.error(error);
  
          if (error.response) {
            console.error(error.response.body);
          }
        }
      );
  
      res.send(otp);
    } catch (err) {
      res.send(err);
      console.log(err);
    }
});

patientRouter.post("/forgetpassword",async(req,res)=>{
    let {email,password}=req.body;
    try{
        const user = await UserModel.findOne({ email });
         if(user){
            bcrypt.hash(password, 5, async (err, hash) => {
                console.log(hash);
                let id=user._id;
                let data= await UserModel.findByIdAndUpdate(id,{"password":hash});
                res.status(201).send({ "msg": "Password update Succesfull" })
            });

        }else{
            res.status(400).send({"error":"Please provide correct E-mail Id"})
        }

    }catch(err){
        res.status(400).send({"error":err})
    }
})

patientRouter.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

patientRouter.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/login', session: false}), googleOauth('Patient'));

module.exports = {
    patientRouter
};

