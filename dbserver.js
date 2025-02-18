const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = 'mongodb+srv://hamzaarfanfazal2350:hamza2350@cluster0.u7fb4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
  });
  
  const RequestHistorySchema = new mongoose.Schema({
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    method: { type: String, required: true },
    url: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: Number, required: true },
    responseTime: { type: Number, required: true },
    responseSize: { type: Number, required: true },
    success: { type: Boolean, required: true },
    apiName: { type: String },
    folderName: { type: String },
    requestDetails: {
      headers: [{ key: String, value: String }],
      body: mongoose.Schema.Types.Mixed,
      queryParams: [{ key: String, value: String }],
      auth: mongoose.Schema.Types.Mixed
    },
    responseDetails: {
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed
    },
    errorContext: {
      type: { type: String },
      message: { type: String },
      details: mongoose.Schema.Types.Mixed
    }
  });
  const User = mongoose.model('User', UserSchema);
  const RequestHistory = mongoose.model('RequestHistory', RequestHistorySchema);
  
app.post('/api/request-history', async (req, res) => {
    try {
      const { 
        userId, 
        method, 
        url, 
        status, 
        responseTime, 
        responseSize, 
        success, 
        apiName, 
        folderName, 
        requestDetails 
      } = req.body;
  
      const newRequestHistory = new RequestHistory({
        userId,
        method,
        url,
        status,
        responseTime,
        responseSize,
        success,
        apiName,
        folderName,
        requestDetails
      });
  
      await newRequestHistory.save();
      res.status(201).json({ success: true, requestHistory: newRequestHistory });
    } catch (error) {
      console.error('Error saving request history:', error);
      res.status(500).json({ success: false, message: 'Failed to save request history' });
    }
  });
  
  app.get('/api/request-history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, page = 1 } = req.query;
  
      const requestHistories = await RequestHistory.find({ userId })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
  
      const total = await RequestHistory.countDocuments({ userId });
  
      res.json({
        success: true,
        requestHistories,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching request history:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch request history' });
    }
  });

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ 
      success: true, 
      user: { email: newUser.email } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        email: user.email 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const CollectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const ApiSchema = new mongoose.Schema({
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  name: { type: String, required: true },
  method: { type: String, required: true, default: 'GET' },
  url: { type: String, default: "" },
  headers: { type: [{ key: String, value: String }], default: [] },
  queryParams: { type: [{ key: String, value: String }], default: [] },
  body: {
    type: { type: String, default: "none" },
    content: { type: String, default: "" },
    formData: { type: [{ key: String, value: String }], default: [] },
    urlencoded: { type: [{ key: String, value: String }], default: [] }
  },
  scripts: {
    preRequest: { type: String, default: "" },
    tests: { type: String, default: "" }
  },
  auth: {
    type: { type: String, default: "none" },
    bearer: String,
    basic: {
      username: String,
      password: String
    },
    apiKey: String,
    jwt: {
      key: { type: String, default: "" },
      value: { type: String, default: "" },
      pairs: { type: [{ key: String, value: String }], default: [] }
    },
    avqJwt: {
      value: { type: String, default: "" }
    }
  },
  settings: {
    followRedirects: { type: Boolean, default: true },
    sslVerification: { type: Boolean, default: true },
    timeout: { type: Number, default: 0 },
    responseSizeLimit: { type: Number, default: 50 },
    saveResponses: { type: Boolean, default: true },
    enableProxy: { type: Boolean, default: false },
    proxyUrl: { type: String, default: "" },
    proxyAuth: { type: Boolean, default: false },
    proxyUsername: { type: String, default: "" },
    proxyPassword: { type: String, default: "" }
  }
});
const Collection = mongoose.model('Collection', CollectionSchema);
const Api = mongoose.model('Api', ApiSchema);

app.post('/api/collections', async (req, res) => {
  try {
    const { name, userId } = req.body;
    const newCollection = new Collection({ name, userId });
    await newCollection.save();
    res.status(201).json({ success: true, collection: newCollection });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create collection' });
  }
});

app.get('/api/collections/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const collections = await Collection.find({ userId });
    const collectionsWithApis = await Promise.all(
      collections.map(async (collection) => {
        const apis = await Api.find({ collectionId: collection._id });
        return {
          id: collection._id,
          name: collection.name,
          apis: apis.map(api => ({
            id: api._id,
            name: api.name,
            method: api.method,
            url: api.url,
            headers: api.headers,
            queryParams: api.queryParams,
            body: api.body,
            scripts: api.scripts,
            auth: api.auth
          }))
        };
      })
    );
    res.json({ success: true, collections: collectionsWithApis });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collections' });
  }
});

app.delete('/api/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Collection.findByIdAndDelete(id);
    await Api.deleteMany({ collectionId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete collection' });
  }
});

app.put('/api/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedCollection = await Collection.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );
    res.json({ success: true, collection: updatedCollection });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update collection' });
  }
});

app.post('/api/apis', async (req, res) => {
  try {
    const { collectionId, name, method } = req.body;
    const newApi = new Api({ collectionId, name, method });
    await newApi.save();
    res.status(201).json({ success: true, api: newApi });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create API' });
  }
});

app.delete('/api/apis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Api.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete API' });
  }
});

app.put('/api/apis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedApi = await Api.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ success: true, api: updatedApi });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update API' });
  }
});
const AuthTemplateSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { type: String, required: true },
  pairs: [{
    key: String,
    value: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AuthTemplate = mongoose.model('AuthTemplate', AuthTemplateSchema);

app.get('/api/templates/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const templates = await AuthTemplate.find({ userId })
      .sort({ updatedAt: -1 });
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { userId, name, pairs } = req.body;
    const template = new AuthTemplate({
      userId,
      name,
      pairs
    });

    const newTemplate = await template.save();
    res.status(201).json({ success: true, template: newTemplate });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(400).json({ success: false, message: 'Failed to create template' });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pairs } = req.body;
    
    const updatedTemplate = await AuthTemplate.findByIdAndUpdate(
      id,
      {
        name,
        pairs,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, template: updatedTemplate });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(400).json({ success: false, message: 'Failed to update template' });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTemplate = await AuthTemplate.findByIdAndDelete(id);
    
    if (!deletedTemplate) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));