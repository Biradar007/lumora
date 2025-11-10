import React from 'react';
import { AlertCircle, Phone, MessageCircle, Globe, Clock, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CrisisResource {
  name: string;
  description: string;
  phone: string;
  text?: string;
  website?: string;
  hours: string;
  icon: LucideIcon;
}

const crisisResources: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support for people in distress and crisis prevention.',
    phone: '988',
    text: 'Text HOME to 741741',
    website: 'suicidepreventionlifeline.org',
    hours: '24/7',
    icon: Phone
  },
  {
    name: 'Crisis Text Line',
    description: 'Free, 24/7 support via text message for anyone in crisis.',
    phone: '1-741-741',
    text: 'Text HELLO to 741741',
    website: 'crisistextline.org',
    hours: '24/7',
    icon: MessageCircle
  },
  {
    name: 'SAMHSA National Helpline',
    description: 'Treatment referral and information service for mental health and substance use.',
    phone: '1-800-662-4357',
    website: 'samhsa.gov',
    hours: '24/7',
    icon: Globe
  },
  {
    name: 'Trans Lifeline',
    description: 'Crisis support specifically for transgender individuals.',
    phone: '877-565-8860',
    website: 'translifeline.org',
    hours: '24/7',
    icon: Shield
  }
];

const emergencySteps = [
  {
    title: 'Immediate Danger',
    description: 'If you are in immediate physical danger, call 911 or go to your nearest emergency room.',
    color: 'bg-red-50 border-red-300 text-red-800'
  },
  {
    title: 'Suicidal Thoughts',
    description: 'If you are having thoughts of suicide, call 988 or text HOME to 741741 immediately.',
    color: 'bg-orange-50 border-orange-300 text-orange-800'
  },
  {
    title: 'Need to Talk',
    description: 'If you need someone to talk to, reach out to any of the crisis resources below.',
    color: 'bg-blue-50 border-blue-300 text-blue-800'
  }
];

const safetyTips = [
  'Remove any means of self-harm from your immediate environment',
  'Stay with trusted friends or family members',
  'Avoid alcohol and drugs, which can worsen symptoms',
  'Create a safety plan with specific steps to take during a crisis',
  'Keep crisis hotline numbers easily accessible',
  'Practice grounding techniques like deep breathing or mindfulness'
];

interface CrisisSupportProps {
  onReturnToChat?: () => void;
}

export function CrisisSupport({ onReturnToChat }: CrisisSupportProps) {
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-4xl mx-auto space-y-6">
      {/* Emergency Alert */}
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-red-800">Crisis Support</h1>
            <p className="text-red-700">Immediate help when you need it most</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <p className="text-lg font-semibold text-red-800 mb-2">
            🚨 If you&apos;re in immediate danger, call 988
          </p>
          <p className="text-red-700">
            This page provides crisis resources, but if you&apos;re experiencing a medical emergency or are in immediate physical danger, please call emergency services right away.
          </p>
        </div>
      </div>

      {/* Emergency Steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">What to Do Right Now</h2>
        <div className="space-y-4">
          {emergencySteps.map((step, index) => (
            <div key={index} className={`p-4 rounded-lg border-2 ${step.color}`}>
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Crisis Hotlines */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Crisis Hotlines & Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {crisisResources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <div key={index} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 mb-2">{resource.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        <a href={`tel:${resource.phone}`} className="font-bold text-green-600 hover:text-green-800 text-lg">
                          {resource.phone}
                        </a>
                      </div>
                      
                      {resource.text && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 text-sm">{resource.text}</span>
                        </div>
                      )}
                      
                      {resource.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-purple-600" />
                          <a href={`https://${resource.website}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 text-sm">
                            {resource.website}
                          </a>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600 text-sm">{resource.hours}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Tips */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Safety & Coping Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safetyTips.map((tip, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">{index + 1}</span>
              </div>
              <p className="text-gray-700">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* International Resources */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">International Crisis Support</h2>
        <p className="text-gray-700 mb-4">
          If you&apos;re located outside the United States, please visit these resources for crisis support in your country:
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-purple-700 font-medium">
            Find a Helpline (Global)
          </a>
          <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-purple-700 font-medium">
            International Association for Suicide Prevention
          </a>
        </div>
      </div>

      {/* Return to Chat */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Continue Your Journey</h3>
        <p className="text-gray-600 mb-4">
          After getting the support you need, Lumora is here to help you continue your mental health journey.
        </p>
        <button
          type="button"
          onClick={onReturnToChat}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
        >
          Return to Chat
        </button>
      </div>
    </div>
  );
}
