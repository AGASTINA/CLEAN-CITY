const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  // Waste Classification Prompt
  async classifyWaste(imageBuffer, locationContext = {}) {
    try {
      const prompt = `You are an urban waste analysis AI system deployed for Madurai Municipal Corporation.

Analyze the uploaded image and provide:

1. Waste Type (plastic / organic / mixed / construction / medical / e-waste / hazardous / textile)
2. Severity Score (1-5, where 5 is most severe)
3. Estimated Volume (low / medium / high / critical)
4. Risk Level (low / moderate / high / critical)
5. Is this likely illegal dumping? (yes/no)
6. Environmental Hazard Level (0-10)
7. Short Explanation (2-3 sentences)
8. Confidence Level (0-1)

${locationContext.wardNumber ? `Location Context: Ward ${locationContext.wardNumber}` : ''}

Provide response in valid JSON format with these exact keys:
{
  "wasteType": "",
  "subType": "",
  "severityScore": 0,
  "estimatedVolume": "",
  "riskLevel": "",
  "isIllegalDumping": false,
  "environmentalHazardLevel": 0,
  "explanation": "",
  "confidence": 0.0,
  "recommendations": []
}`;

      // Convert image buffer to base64
      const imageBase64 = imageBuffer.toString('base64');

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        }
      ]);

      const response = result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Gemini Waste Classification Error:', error);
      throw error;
    }
  }

  // Overflow Prediction Prompt
  async predictOverflow(wardData) {
    try {
      const prompt = `You are a predictive waste intelligence AI.

Given the following reports for Ward ${wardData.wardNumber}:
- Number of active reports: ${wardData.activeReports}
- Severity distribution: ${JSON.stringify(wardData.severityDistribution)}
- Average response time: ${wardData.avgResponseTime} minutes
- Past 7-day trend: ${JSON.stringify(wardData.weeklyTrend)}
- Current cleanliness index: ${wardData.cleanlinessIndex}
- Infrastructure capacity: ${wardData.binCapacity} cubic meters

Predict:
1. Probability of overflow (percentage 0-100)
2. Estimated time to overflow (in hours, can be null if not imminent)
3. Urgency level (low / medium / high / critical)
4. Recommended immediate action (brief, actionable)
5. Long-term preventive strategy (brief)
6. Hotspot locations that need attention
7. Resource allocation recommendation

Provide response in valid JSON format:
{
  "overflowProbability": 0,
  "estimatedTimeToOverflow": null,
  "urgencyLevel": "",
  "immediateAction": "",
  "preventiveStrategy": "",
  "hotspotRecommendations": [],
  "resourceAllocation": "",
  "confidence": 0.0
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Gemini Overflow Prediction Error:', error);
      throw error;
    }
  }

  // Route Optimization Advisory Prompt
  async optimizeRoute(hotspots) {
    try {
      const prompt = `You are a municipal route planning AI.

Based on the following hotspot coordinates and severity levels:
${JSON.stringify(hotspots, null, 2)}

Suggest:
1. Optimal cleaning route order (array of location indices)
2. Truck allocation recommendation (number and type)
3. Estimated fuel/time savings (percentage compared to default)
4. Workforce distribution suggestion (workers per location)
5. Estimated completion time (in hours)
6. Priority sequence explanation

Provide response in valid JSON format:
{
  "routeOrder": [],
  "truckAllocation": {
    "small": 0,
    "medium": 0,
    "large": 0
  },
  "estimatedSavings": {
    "fuel": 0,
    "time": 0
  },
  "workforceDistribution": {},
  "estimatedCompletionTime": 0,
  "explanation": ""
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Gemini Route Optimization Error:', error);
      throw error;
    }
  }

  // Circular Economy Advisory Prompt
  async analyzeCircularEconomy(wasteType, quantity, location) {
    try {
      const prompt = `You are a circular economy intelligence AI for Madurai.

For detected waste type: ${wasteType}
Estimated quantity: ${quantity} kg
Location: Ward ${location.wardNumber}, ${location.area}

Provide:
1. Recycling method (detailed process)
2. Local processing recommendation (MCC center / private recycler / contractor / SHG)
3. Revenue potential per kg (in INR)
4. Environmental impact reduction (CO2, landfill diversion %, water saved)
5. Employment generation opportunity (number of jobs, type: SHG / local units)
6. Feasibility score (1-10)
7. Processing timeline
8. Specific local partner recommendations in Madurai

Format response as valid JSON:
{
  "recyclingMethod": "",
  "processingRecommendation": {
    "type": "",
    "facility": "",
    "contact": ""
  },
  "revenuePotential": {
    "perKg": 0,
    "totalEstimate": 0
  },
  "environmentalImpact": {
    "co2Reduction": 0,
    "landfillDiversion": 0,
    "waterSaved": 0
  },
  "employmentGeneration": {
    "jobsCreated": 0,
    "type": "",
    "targetGroups": []
  },
  "feasibilityScore": 0,
  "processingTimeline": "",
  "localPartners": []
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Gemini Circular Economy Analysis Error:', error);
      throw error;
    }
  }

  // Policy Suggestion Engine Prompt
  async generatePolicyRecommendation(incidentData) {
    try {
      const prompt = `You are an AI policy advisor for Madurai Corporation.

Based on repeated waste incidents at:
Location: ${incidentData.location}
Ward: ${incidentData.wardNumber}
Incident count: ${incidentData.incidentCount}
Time period: ${incidentData.timeframe}
Waste types: ${incidentData.wasteTypes.join(', ')}
Severity pattern: ${JSON.stringify(incidentData.severityPattern)}

Suggest:
1. Root cause analysis (detailed, 3-5 points)
2. Infrastructure recommendation (bins, CCTV, lighting, signage)
3. Awareness strategy (campaign ideas, target audience)
4. Enforcement action (patrol schedule, penalty structure)
5. Budget priority level (low / medium / high / urgent)
6. Expected impact (reduction in complaints %, ROI %)
7. Implementation timeline
8. Success metrics

Respond in government advisory tone with valid JSON:
{
  "rootCause": {
    "primary": "",
    "contributing": []
  },
  "infrastructure": [
    {
      "type": "",
      "quantity": 0,
      "locations": [],
      "estimatedCost": 0,
      "priority": "",
      "expectedImpact": ""
    }
  ],
  "awareness": {
    "campaigns": [],
    "targetAudience": [],
    "channels": [],
    "duration": ""
  },
  "enforcement": {
    "actions": [],
    "schedule": "",
    "resources": []
  },
  "budgetPriority": "",
  "estimatedImpact": {
    "complaintReduction": 0,
    "roi": 0,
    "timeToImplement": 0
  },
  "implementation": {
    "phases": [],
    "timeline": ""
  },
  "successMetrics": []
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Gemini Policy Recommendation Error:', error);
      throw error;
    }
  }

  // General Analysis
  async analyzeText(text, context = '') {
    try {
      const prompt = context ? `${context}\n\n${text}` : text;
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini Text Analysis Error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();
