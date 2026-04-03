const mongoose = require('mongoose');

const MAX_NAME_WORDS = 20;
const MAX_DESCRIPTION_WORDS = 200;
const MAX_INSTRUCTION_WORDS = 500;

const countWords = (value = '') =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const botSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      validate: {
        validator: (value) => countWords(value) <= MAX_NAME_WORDS,
        message: `Name can have at most ${MAX_NAME_WORDS} words`
      }
    },
    // Used for case-insensitive uniqueness checks.
    nameKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => countWords(value) <= MAX_DESCRIPTION_WORDS,
        message: `Description can have at most ${MAX_DESCRIPTION_WORDS} words`
      }
    },
    instructions: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => countWords(value) <= MAX_INSTRUCTION_WORDS,
        message: `Instructions can have at most ${MAX_INSTRUCTION_WORDS} words`
      }
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    avatarBackground: {
      type: String,
      default: ''
    },
    knowledgeFiles: [
      {
        fileId: { type: String, default: '' },
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true }
      }
    ],
    memoryEnabled: {
      type: Boolean,
      default: true
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

botSchema.pre('validate', function setNameKey() {
  this.nameKey = String(this.name || '').trim().toLowerCase();
});

botSchema.virtual('avatarFallbackLetter').get(function getAvatarFallbackLetter() {
  const trimmedName = String(this.name || '').trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : '';
});

const botModel = mongoose.model('Bot', botSchema);

module.exports = {
  botModel,
  countWords,
  MAX_NAME_WORDS,
  MAX_DESCRIPTION_WORDS,
  MAX_INSTRUCTION_WORDS
};
