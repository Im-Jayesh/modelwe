import mongoose from "mongoose";

const portfolioSettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true // Indexed for fast lookups
    },
    theme: {
        type: String,
        enum: ['first', 'second'], // Add more theme names here as you build them!
        default: 'first'
    },
    backgroundColor: {
        type: String,
        default: '#483e3b',
        trim: true
    }
}, { 
    timestamps: true 
});

const PortfolioSettings = mongoose.models.PortfolioSettings || mongoose.model('PortfolioSettings', portfolioSettingsSchema);

export default PortfolioSettings;