import { NutritionChat } from '@/components/nutrition-chat';

export default function NutritionChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Nutrition Solutions AI Chat
          </h1>
          <p className="text-lg text-gray-600">
            Get personalized nutrition guidance and answers to all your questions
          </p>
        </div>

        <NutritionChat />

        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">What can I help you with?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-gray-700">Custom meal plans</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-gray-700">Pricing information</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-gray-700">Program details</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-gray-700">Success stories</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-gray-700">Fitness guidance</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-gray-700">Getting started</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}