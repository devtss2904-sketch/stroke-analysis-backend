/**
 * Base Repository providing common MongoDB CRUD operations
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return this.model.create(data);
  }

  async find(filter = {}, projection = null, options = {}) {
    return this.model.find(filter, projection, options).lean();
  }

  async findById(id, projection = null) {
    return this.model.findById(id, projection).lean();
  }

  async findOne(filter, projection = null) {
    return this.model.findOne(filter, projection).lean();
  }

  async updateById(id, updateData, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, updateData, options).lean();
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}

module.exports = BaseRepository;

