import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Users, 
  Calendar, 
  MapPin, 
  MessageCircle, 
  Heart, 
  Sparkles, 
  ChevronRight,
  Play,
  Star,
  CheckCircle,
  Globe,
  Bell,
  Search,
  Shield,
  Building,
  GraduationCap,
  Coffee
} from 'lucide-react';

const LandingPage = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const typingTexts = [
    "Connect with TMU students downtown",
    "Discover events at 350 Victoria Street",
    "Explore Toronto's urban campus",
    "Join the TMU community revolution"
  ];

  useEffect(() => {
    setIsVisible(true);
    
    // Auto-rotate features
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Typing animation effect
  useEffect(() => {
    if (!isTyping) return;

    const currentText = typingTexts[currentTextIndex];
    
    if (typedText.length < currentText.length) {
      const timeout = setTimeout(() => {
        setTypedText(currentText.slice(0, typedText.length + 1));
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      // Pause before starting next text
      const timeout = setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % typingTexts.length);
        setTypedText('');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [typedText, currentTextIndex, isTyping, typingTexts]);

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Connect with TMU Students",
      description: "Meet fellow Rams across all faculties - from Engineering to Business, Arts to Science. Build study groups, find project partners, and make lifelong friendships.",
      color: "from-blue-500 to-purple-600",
      highlights: ["Cross-faculty networking", "Study group matching", "Program-specific connections"]
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Downtown Campus Events",
      description: "Stay connected to everything happening at TMU and in downtown Toronto. From RSU events to faculty mixers, career fairs to social nights.",
      color: "from-orange-500 to-red-500",
      highlights: ["RSU event updates", "Faculty-specific events", "Downtown Toronto activities"]
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Navigate TMU & Toronto",
      description: "Find your way around TMU's urban campus and discover the best study spots, food courts, and hidden gems in downtown Toronto.",
      color: "from-green-500 to-teal-500",
      highlights: ["Campus building finder", "Best study spots", "Downtown Toronto hotspots"]
    }
  ];

  const platformFeatures = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Real-time Messaging",
      description: "Chat with fellow TMU students, create project groups, and stay connected with your campus community."
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Like & Share",
      description: "Show appreciation for posts, events, and share interesting content with your TMU network."
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Smart Search",
      description: "Find TMU students, campus events, and content quickly with our intelligent search system."
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "TMU Notifications",
      description: "Get alerts about important deadlines, RSU events, and campus announcements that matter to you."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy First",
      description: "Your TMU student data is protected with enterprise-grade security and privacy controls."
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Campus-Wide Access",
      description: "Connect with students across all TMU faculties and programs, from downtown to satellite campuses."
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-500 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-6">
        <div className="flex items-center space-x-2">
          <div className="text-2xl">🎓</div>
          <span className="text-white text-xl font-bold">Yapp</span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link 
            to="/login"
            className="text-gray-300 hover:text-white transition-colors px-2 sm:px-4 py-2 text-sm sm:text-base"
          >
            Sign In
          </Link>
          <Link 
            to="/signup"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
          >
            Join TMU Community
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-8 py-12 sm:py-20 text-center">
        <div className={`max-w-4xl mx-auto transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 mr-2 sm:mr-3" />
            <span className="text-orange-400 font-semibold text-sm sm:text-base">The Future of TMU Campus Social</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent animate-float">
              Your TMU.
            </span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent animate-gradient animate-float" style={{animationDelay: '0.5s'}}>
              Discover.
            </span>
            <br />
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent animate-float" style={{animationDelay: '1s'}}>
              Explore.
            </span>
          </h1>
          
          {/* Typing Animation */}
          <div className="h-8 sm:h-10 mb-8 flex items-center justify-center">
            <span className="text-lg sm:text-xl text-gray-300">
              {typedText}
              <span className="animate-pulse">|</span>
            </span>
          </div>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto px-4">
            Yapp is the revolutionary campus social platform designed exclusively for TMU students. 
            Connect with your campus community, discover amazing events happening downtown, and explore Toronto like never before.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 px-4">
            <button 
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 flex items-center animate-glow"
            >
              Join the Ram Community
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </button>
            <div className="text-sm text-gray-400">
              ✓ Verified TMU students only
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="relative z-10 px-4 sm:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need for TMU campus life
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features designed specifically for Toronto Metropolitan University students, built by students, for students
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 transition-all duration-500 transform hover:scale-105 ${
                  currentFeature === index ? 'border-orange-500/50 shadow-orange-500/25' : ''
                }`}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-center text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="relative z-10 px-4 sm:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for modern campus life
            </h2>
            <p className="text-gray-400 text-lg">
              Every feature is designed to enhance your TMU university experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500/20 to-purple-500/20 flex items-center justify-center text-orange-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 backdrop-blur-lg border border-white/10 rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to transform your TMU campus experience?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Join thousands of TMU students who are already connecting, discovering, and exploring with Yapp.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 flex items-center"
              >
                Join with TMU Email
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
              <button 
                className="text-gray-300 hover:text-white transition-colors font-semibold"
              >
                Already part of the community? Sign in
              </button>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Requires valid @torontomu.ca or @ryerson.ca email address
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-8 py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="text-2xl">🎓</div>
              <span className="text-white text-xl font-bold">Yapp</span>
            </div>
            <div className="flex items-center space-x-6 text-gray-400">
              <span>© 2024 Yapp. All rights reserved.</span>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;