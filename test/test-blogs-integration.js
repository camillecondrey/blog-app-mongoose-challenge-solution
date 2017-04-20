const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData(){
	console.info('seeding restaurant data');
	const seedData = [];

	for (let i=1; i<=10; i++) {
		seedData.push(generateBlogData());
	}
	return BlogPost.insertMany(seedData);
}


function generateBlogData() {
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()},
		title: faker.lorem.text(),
		content: faker.lorem.sentence(),
		created: faker.date.recent()
	}
}

function tearDownDb(){
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function(){

	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function(){
		return seedBlogPostData();
	});

	afterEach(function(){
		return tearDownDb();
	});

	after(function(){
		return closeServer();
	});

	describe('GET endpoint', function() {

		it('should return all existing blog posts', function() {

			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res){
					res = _res;
					res.should.have.status(200);
					res.body.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then(function(count) {
					res.body.should.have.length.of(count);
				});
		});


		it('should return blog posts with right fields', function() {

			let resBlogPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res){
					res.should.have.status(200);
					res.should.be.json;
					res.body.should.be.a('array');
					res.body.should.have.length.of.at.least(1);

					res.body.forEach(function(blog){
						blog.should.be.a('object');
						blog.should.include.keys(
							'id', 'author', 'title', 'content');
					});
					resBlogPost = res.body[0];
					return BlogPost.findById(resBlogPost.id);
				})
				.then(function(blog){
					resBlogPost.id.should.equal(blog.id);
					resBlogPost.author.should.equal(blog.author.firstName + " " + blog.author.lastName);
					resBlogPost.title.should.equal(blog.title);
					resBlogPost.content.should.equal(blog.content);
					

				});
		});
		
	});

	describe('POST endpoint', function(){

		it('should add a new blog post', function(){
			const newBlogPost = generateBlogData();

			return chai.request(app)
				.post('/posts')
				.send(newBlogPost)
				.then(function(res) {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys(
						'id', 'author', 'title', 'content');
					res.body.id.should.not.be.null;

					return BlogPost.findById(res.body.id);
				})
				.then(function(blogPost){
					blogPost.author.firstName.should.equal(newBlogPost.author.firstName);
					blogPost.author.lastName.should.equal(newBlogPost.author.lastName);
					blogPost.title.should.equal(newBlogPost.title);
					blogPost.content.should.equal(newBlogPost.content);
				});

		});
	});

	describe('PUT endpoint', function() {

		it('should update fields you send over', function() {
			const updateData = {
				title: 'new blog title',
				content: 'new blog content'
			};

			return BlogPost
				.findOne()
				.exec()
				.then(function(blogPost){
					updateData.id = blogPost.id

					return chai.request(app)
						.put(`/posts/${blogPost.id}`)
						.send(updateData);
				})
				.then(function(res) {
					res.should.have.status(201);

					return BlogPost.findById(updateData.id).exec();
				})
				.then(function(blogPost){
					blogPost.title.should.equal(updateData.title);
					blogPost.content.should.equal(updateData.content);
				});
		});
	});

	describe('DELETE endpoint', function() {

		it('should delete a blog post by id', function() {

			let blogPost;

			return BlogPost
				.findOne()
				.exec()
				.then(function(_blogPost) {
					blogPost = _blogPost;
					return chai.request(app).delete(`/posts/${blogPost.id}`);

				})
				.then(function(res) {
					res.should.have.status(204);
					return BlogPost.findById(blogPost.id).exec();
				})
				.then(function(_blogPost){
					should.not.exist(_blogPost);
				});
		});
	});
});
