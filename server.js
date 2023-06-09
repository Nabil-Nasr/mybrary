import cookieSession from "cookie-session";
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import methodOverride from 'method-override';
import { app, dbConnection } from './configs/database.js';
import { globalError } from "./middlewares/global-error.js";
import adminsRouter from './routes/admins.js';
import authorsRouter from './routes/authors.js';
import booksRouter from './routes/books.js';
import indexRouter from './routes/index.js';
import { ApiError } from "./utils/api-error.js";


app.set('view engine', 'ejs');
app.set('layout', 'layouts/layout');
// two lines below will extract js ,link and style tags from the rendered ejs to layout.ejs 
// in the variables script and style
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);


app.use(expressLayouts);
// _method will be used in front-end post request
app.use(methodOverride("_method"));
app.use(express.static('public'));
// for receiving post requests from front-end
app.use(express.urlencoded({ limit: '20kb', extended: false }));
app.use(cookieSession({ secret: process.env.COOKIE_SECRET ,httpOnly:true}));


const server = await dbConnection();

if (process.env.NODE_ENV === 'development') {
	try {
		const logger = (await import('morgan')).default;
		app.use(logger('dev'));
		console.log(`mode:${process.env.NODE_ENV}`);
	} catch (error) {
		console.log(error);
	}
}

// ============== some security ===================
const windowMs = 30 * 60 * 1000;
app.use(rateLimit({
	windowMs,
	max: 200, // Limit each IP to 200 requests per `window` (here, per 30 minutes)
	message: `Too many requests from this IP, please try again in ${windowMs / 60 / 1000} minutes`,
	handler: async (req, res, next, options) =>
		next(new ApiError("Too many requests", 429, "errors/429", { layout: false, rateLimitMessage: options.message })),
	// returning the ip that will be blocked in too many requests
	// true-client-ip is in render.com and x-forwarded-for exists in render.com and cyclic.sh but it's one ip in cyclic.sh
	keyGenerator: req => req.header('true-client-ip') || req.header('x-forwarded-for')?.split(', ').slice(-1)
}));

// Middleware to protect against HTTP Parameter Pollution attacks
app.use(hpp());

// for not showing express in the response header
app.disable("x-powered-by");
// ===================================================

app.use('/', indexRouter);
app.use('/authors', authorsRouter);
app.use('/books', booksRouter);
app.use(process.env.ADMIN_ROUTE, adminsRouter);
app.all('*', (req, res, next) => {
	next(new ApiError("This Page Not Found", 404));
});

// express errors
app.use(globalError);

// error outside express
process.on("unhandledRejection", err => {
	console.error(`UnhandledRejection : ${err.name} | ${err.message}`);
	// closing the server after ending the requests
	server.close(() => {
		console.error(`Shutting down ......`);
		process.exit(1);
	});
});