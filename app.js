const express = require("express");
const {open} = require("sqlite");
const path = require ("path");
const sqlite3 = require("sqlite3");
const { get } = require("http");
const port = 4000;

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname,"padhakku.db");
// console.log(dbPath)
let db = null ;
const initializeDbAndServer = async() => {
    try {
        db = await open({
                filename : dbPath,
                driver : sqlite3.Database
            })
        app.listen(port, () => (
            console.log(`Server is running at Port:${port}`)
        ))    
    }
    catch(e){
        console.log(`DB ERROR: ${e.message}`);
        process.exit(1);
    }
}

initializeDbAndServer();


const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    return emailRegex.test(email)
}


// 1. Api call for getting all users details and their userId's
app.get("/api/users", async(request,response) => {
    const dbQuery = `
        SELECT *
        FROM users LEFT JOIN user_posts ON users.userId = user_posts.userId
        ORDER BY userID ASC;
    `
    const postsQuery = `
        SELECT *
        FROM user_posts
        ORDER BY postID ASC; 
    `
    try{
        const usersDetails = await db.all(dbQuery);
        const postsDetails = await db.all(postsQuery);
        response.status(200).json({
            status:200,
            allUsersDetails : usersDetails,
            allPostsDetails : postsDetails  
        })  
    }
    catch(e){
        response.status(500).json({
            status : 500,
            message : "Internal Server Error."
        })
    }
})


// 2. Api Call for User Registration
app.post("/api/signup",async(request,response) => {
    const {username,email} = request.body;
    const userRegistrationQuery = `
        INSERT INTO users(
            username,email
        )
        VALUES(
            ?, ?
        );
    `;
    const emailCheckQuery = `
            SELECT * 
            FROM users
            WHERE email = ? ;
    `;
    
    try {
        const isEmailRegistered = await db.get(emailCheckQuery, [email]);
        // console.log(isEmailRegistered)
        if (isEmailRegistered !== undefined){
            response.status(400).json({
                status: 400,
                message : "Email already registered."
            })
        }
        else if (!isValidEmail(email)){
            response.status(400).json({
                status : 400,
                message : "Invalid email format."
            })
        }
        else{    
            await db.run(userRegistrationQuery, [username,email]);
            response.status(200).json({
            status : 200,
            message : "Successfull user sign-up."
            })
        }
    }
    catch(e){
        await response.status(500).json({
            status : 500,
            message : "Internal Server Error."
        })
    }

})

// 3. Api call for posting 
app.post("/api/posts", async(request,response) => {
    const {userId, post} = request.body;
    const postQuery = `
        INSERT INTO user_posts (
            userId,post
        )
        VALUES(
            ?,?
        );
    `;

    const validateUserIdQuery = `
            SELECT *
            FROM users
            WHERE userId = ?;
    `;

    try{
        const isUserIdPresent = await db.get(validateUserIdQuery, [userId])
        // console.log(isUserIdPresent);

        if (isUserIdPresent === undefined){
            await response.status(404).json({
                status : 404,
                message : "User ID not found."
            })
        }
        else if (!post.length > 0){
            await response.status(400).json({
                status : 400,
                message : "Content cannot be empty."
            })
        }   
        else{
            await db.run(postQuery, [userId, post]);
            await response.status(200).json({
                status  :200,
                message : "Successfully created."
            })
        }
    }
    catch(e){
        await response.status(500).json({
            status : 500,
            message : "Internal Server Error."
        })
    }

})



// 4. Api call for Deleting the Post 
app.delete("/api/deletepost/:postId", async(request,response) => {
    const {postId} = request.params;
    // console.log(postId)
    const deletePostQuery = `
        DELETE FROM user_posts
        WHERE postId = ? ;    
    `;

    const validatePostIdQuery = `
        SELECT *
        FROM user_posts
        WHERE postId = ?;
    `;

    try{
        const isPostIdValid = await db.get(validatePostIdQuery, [postId]);
        if (isPostIdValid === undefined) {
            response.status(404).json({
                status : 404,
                message : "Post ID not found."
            })
        }
        else{
            await db.run(deletePostQuery, [postId]);
            response.status(200).json({
                status : 200,
                message : "Successful post deletion."
            })
        }
    }
    catch(e){
        await response.status(500).json({
            status : 500,
            message : "Internal Server Error."
        })
    }


}) 


// 5. Api call for fetching Users Posts 
app.get("/api/posts/:userId", async (request,response) => {
    const {userId} = request.params;

    const getUsersPostsQuery = `
        SELECT postId, post as content
        FROM user_posts
        WHERE userId = ?;
    `;

    const validateUserIdQuery = `
            SELECT *
            FROM users
            WHERE userId = ?;
    `;

    try{
        const isUserIdPresent = await db.get(validateUserIdQuery, [userId])
        const getAllUsersPosts = await db.all(getUsersPostsQuery, [userId])

        if (isUserIdPresent === undefined){
            await response.status(404).json({
                status : 404,
                message : "User ID not found."
            })
        }
        else if (getAllUsersPosts.length < 1) {
            await response.status(404).json({
                status : 404,
                message : "No posts found for this user."
            })
        }
        else {
            await response.status(200).json({
                status: 200,
                posts : getAllUsersPosts
            })
        }
    }
    catch(e){
        await response.status(500).json({
            status : 500,
            message : "Internal Server Error."
        })
    }

})