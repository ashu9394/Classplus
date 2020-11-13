// Login Functionality
const assert = require('assert');
const Sequelize = require('sequelize');
const shortid = require('shortid');
const moment = require('moment');


// to connect and check data in mysql database
// mysql -h sql12.freemysqlhosting.net -u sql12376207 -p
// enter password : BBWXWC6DFx
// use sql12376207


const sequelize = new Sequelize("sql12376207", "sql12376207", "BBWXWC6DFx",{
    host: "sql12.freemysqlhosting.net",
    dialect: "mysql",
    operatorsAliases: false,
    define: {
        timestamps: false
    }
});

// create table users
/*

sequelize.query(
    `CREATE TABLE users(
        id   INT              NOT NULL AUTO_INCREMENT,
        username VARCHAR(255)     NOT NULL,
        password  VARCHAR(255)     NOT NULL,
        is_blocked  boolean,
        last_blocked_time   datetime,
        last_failed_attempt   datetime,
        counter INT ,
        PRIMARY KEY (ID)
    );`,
).then(data=>{
    console.log(data);
}).catch(err=>{
    console.log(err);
})
*/


/**
 * Requirements:
 *
 * If a user enters three wrong passwords consecutively 3 times, then BLOCK the USER. Reset in 1 hour
 * If a user enters three wrong passwords within a sliding  time frame of 30 mins, BLOCK the USER.
 *
 * */

//  now - blocked_at > 1 then unblock , reset counter
// 9am wrong , record last_failed_attempt , counter ++  then if now -  last_failed_attempt < 30 counter++

// workflow 1. check for any flag in db against user , if blocked

const SLIDING_WINDOW_MINS = 30;

class LoginResponeEnum {

    static get SUCCESS() {
        return "SUCCESS";
    }

    static get FAIL() {
        return "FAIL";
    }

    static get BLOCKED() {
        return "BLOCKED";
    }

    static get values() {
        return [this.SUCCESS, this.FAIL, this.BLOCKED];
    }

}




class LoginSimulation {

    constructor() {
        // init some stuff
        this.bootstrapUsers();
    }

    bootstrapUsers() {
        // TODO
        // create some users in the in memory database simulation
        let random_number_of_users = Math.floor(Math.random() * 11)+5; // min should be 5 , max should be 15
        for(let i=0;i<random_number_of_users;i++){
            let sql = `Insert into users (username,password,is_blocked) values ('${shortid.generate()}','${shortid.generate()}',1)`;
            sequelize.query(sql).then(data=>{
                console.log(data);
            }).catch(err=>{
                console.log(err);
            })
        }
    }

    async doLogin(username, password, date = new Date()) {
        // TODO

        try{
            let find_user_with_password = `select * from users where username = '${username}' and password = '${password}'`;
            let get_user_with_pass = await sequelize.query(find_user_with_password);




            if(get_user_with_pass[0].length > 0 && get_user_with_pass[0][0].is_blocked){
                return LoginResponeEnum.BLOCKED; // return a state
            } else if (get_user_with_pass[0].length > 0) {
                let now = moment(new Date(date));
                let duration = moment.duration(now.diff(get_user_with_pass[0][0].last_blocked_time));
                let minutes = duration.asMinutes();

                if(minutes > 60){
                    let update_blocked = `update users set is_blocked = 0 and counter = 0 where username = '${username}'`;
                    await sequelize.query(update_blocked);
                }
                return LoginResponeEnum.SUCCESS; // return a state
            }else {
                // update failed attempt
                let find_user = `select * from users where username = '${username}'`;
                let get_user = await sequelize.query(find_user);

                if(get_user[0].length>0){

                    let now = moment(new Date(date));
                    let duration = moment.duration(now.diff(get_user_with_pass[0][0].last_failed_attempt));
                    let minutes = duration.asMinutes();

                    if(minutes<30){

                        let counter = 1;
                        if(get_user[0][0].counter){
                            counter = get_user[0][0].counter++;
                        }

                        let update_counter = `update users set counter = ${counter} and last_failed_attempt = now()`;
                        await sequelize.query(update_counter);
                    }


                    return LoginResponeEnum.FAIL;
                }
            }
        }catch(err){
            return err;
        }

    }

    inMins(mins) {
        return new Date(+new Date() + mins * 60 * 1000);
    }

    // for testing
    testThreeConsiquitiveFailures() {
        console.log("Testing Three Consequitive wrong passwords");
        assert.equal(this.doLogin("user 1", "wrong pass"), LoginResponeEnum.FAIL);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(20)), LoginResponeEnum.FAIL);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(25)), LoginResponeEnum.BLOCKED);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(40)), LoginResponeEnum.BLOCKED);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(60)), LoginResponeEnum.BLOCKED);
        assert.equal(this.doLogin("user 1", "right pass", this.inMins(60)), LoginResponeEnum.BLOCKED);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(150)), LoginResponeEnum.FAIL);
    }

    testUserIsBlockedInSlidingTimeFrame() {
        console.log("Testing user is blocked in sliding timeframe");
        assert.equal(this.doLogin("user 1", "wrong pass"), LoginResponeEnum.FAIL);
        assert.equal(this.doLogin("user 1", "right pass", this.inMins(5)), LoginResponeEnum.SUCCESS);
        assert.equal(this.doLogin("user 1", "right pass", this.inMins(8)), LoginResponeEnum.SUCCESS);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(20)), LoginResponeEnum.FAIL);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(31)), LoginResponeEnum.FAIL);
        assert.equal(this.doLogin("user 1", "right pass", this.inMins(40)), LoginResponeEnum.SUCCESS);
        assert.equal(this.doLogin("user 1", "wrong pass", this.inMins(44)), LoginResponeEnum.BLOCKED);
        assert.equal(this.doLogin("user 1", "right pass", this.inMins(45)), LoginResponeEnum.BLOCKED);
        assert.equal(this.doLogin("user 1", "right pass", this.inMins(110)), LoginResponeEnum.SUCCESS);
    }

}

// Test condition 1
new LoginSimulation().testThreeConsiquitiveFailures();
// test condition 2
new LoginSimulation().testUserIsBlockedInSlidingTimeFrame();


