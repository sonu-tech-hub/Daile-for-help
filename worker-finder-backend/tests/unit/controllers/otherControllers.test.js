const categoryController = require('../../../src/controllers/categoryController');
const disputeController = require('../../../src/controllers/disputeController');
const messageController = require('../../../src/controllers/messageController');
const referralController = require('../../../src/controllers/referralController');
const reviewController = require('../../../src/controllers/reviewController');
const jobController = require('../../../src/controllers/jobController');

describe('Controller exports smoke tests', () => {
  it('categoryController should export functions', () => {
    expect(typeof categoryController).toBe('object');
  });

  it('disputeController should export functions', () => {
    expect(typeof disputeController).toBe('object');
  });

  it('messageController should export functions', () => {
    expect(typeof messageController).toBe('object');
  });

  it('referralController should export functions', () => {
    expect(typeof referralController).toBe('object');
  });

  it('reviewController should export functions', () => {
    expect(typeof reviewController).toBe('object');
  });

  it('jobController should export functions', () => {
    expect(typeof jobController).toBe('object');
  });
});
