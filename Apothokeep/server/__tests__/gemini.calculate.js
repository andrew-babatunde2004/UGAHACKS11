
const calculateExperationDate = (geminiOutput) => {
    //Option A: Gemini gives us days until expiration 
    if (geminiOutput.daysUntilExpiration) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + geminiOutput.daysUntilExpiration);
        return expirationDate;
    }
    //Option B: Gemini gives us expiration date
    if (geminiOutput.expirationDate) {
        return new Date(geminiOutput.expirationDate);
    }
    //Option C: Gemini gives you shelf life from purchase date
    if (geminiOutput.shelfLifeDays) {
        const purchaseDate = new Date();
   return new Date(purchaseDate.getTime() + geminiOutput.shelfLifeDays * 24 * 60 * 60 * 1000);
    }
};