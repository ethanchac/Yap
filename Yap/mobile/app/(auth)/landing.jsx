import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  StyleSheet,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
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
  Shield
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function Landing() {
  const router = useRouter();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const typingTexts = [
    "Connect with your campus community",
    "Discover amazing events",
    "Explore TMU like never before",
    "Join the next generation of campus social"
  ];

  useEffect(() => {
    setIsVisible(true);
    
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTyping) return;

    const currentText = typingTexts[currentTextIndex];
    
    if (typedText.length < currentText.length) {
      const timeout = setTimeout(() => {
        setTypedText(currentText.slice(0, typedText.length + 1));
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % typingTexts.length);
        setTypedText('');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [typedText, currentTextIndex, isTyping, typingTexts]);

  const features = [
    {
      icon: <Users size={32} color="#FFFFFF" />,
      title: "Smart Social Networking",
      description: "Connect with classmates, join study groups, and build meaningful relationships with people who share your interests and academic goals.",
      color: ["#3B82F6", "#8B5CF6"],
      highlights: ["Friend suggestions", "Study group finder", "Interest-based matching"]
    },
    {
      icon: <Calendar size={32} color="#FFFFFF" />,
      title: "Campus Event Discovery",
      description: "Never miss out on campus life again. Discover events, parties, workshops, and activities happening right on your campus.",
      color: ["#F97316", "#EF4444"],
      highlights: ["Real-time updates", "Event recommendations", "RSVP system"]
    },
    {
      icon: <MapPin size={32} color="#FFFFFF" />,
      title: "Interactive Campus Map",
      description: "Navigate your campus with an interactive map that shows events, study spots, dining locations, and hidden gems.",
      color: ["#10B981", "#14B8A6"],
      highlights: ["Live event locations", "Study spot finder", "Campus navigation"]
    }
  ];

  const platformFeatures = [
    {
      icon: <MessageCircle size={24} color="#FB923C" />,
      title: "Real-time Messaging",
      description: "Chat with friends, create group conversations, and stay connected with your campus community."
    },
    {
      icon: <Heart size={24} color="#FB923C" />,
      title: "Like & Share",
      description: "Show appreciation for posts, events, and share interesting content with your network."
    },
    {
      icon: <Search size={24} color="#FB923C" />,
      title: "Smart Search",
      description: "Find people, events, and content quickly with our intelligent search and filtering system."
    },
    {
      icon: <Bell size={24} color="#FB923C" />,
      title: "Smart Notifications",
      description: "Get personalized notifications about events, messages, and activities that matter to you."
    },
    {
      icon: <Shield size={24} color="#FB923C" />,
      title: "Privacy First",
      description: "Your data is protected with enterprise-grade security and privacy controls."
    },
    {
      icon: <Globe size={24} color="#FB923C" />,
      title: "Campus-Wide Access",
      description: "Connect with students across your entire university campus, not just your department."
    }
  ];

  const handleJoinNow = () => {
    router.push('/(auth)/authentication/signup');
  };

  const handleSignIn = () => {
    router.push('/(auth)/authentication/login');
  };

  const handleGetStarted = () => {
    router.push('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Navigation */}
        <View style={styles.nav}>
          <Text style={styles.logo}>Yapp</Text>
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinNow}>
              <Text style={styles.joinButtonText}>Join Now!</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgeContainer}>
            <View style={styles.badgeContent}>
              <Sparkles size={20} color="#FB923C" />
              <Text style={styles.badge}>The Future of Campus Social</Text>
            </View>
          </View>
          
          <Text style={styles.heroTitle}>
            <Text style={styles.titleWhite}>Connect.</Text>
            {'\n'}
            <Text style={styles.titleOrange}>Discover.</Text>
            {'\n'}
            <Text style={styles.titleWhite}>Explore.</Text>
          </Text>
          
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>
              {typedText}<Text style={styles.cursor}>|</Text>
            </Text>
          </View>
          
          <Text style={styles.heroDescription}>
            Yapp is the revolutionary campus social platform designed exclusively for TMU students. Connect with your community, discover amazing events across downtown Toronto, and explore your urban campus like never before.
          </Text>
          
          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleJoinNow}>
              <View style={styles.primaryButtonContent}>
                <Text style={styles.primaryButtonText}>Join Now!</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.verifiedText}>✓ Verified TMU students only</Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Everything you need to thrive on campus</Text>
          <Text style={styles.sectionSubtitle}>
            Powerful features designed specifically for university life, built by students, for students
          </Text>
          
          {features.map((feature, index) => (
            <View 
              key={index}
              style={[
                styles.featureCard,
                currentFeature === index && styles.featureCardActive
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color[0] }]}>
                {feature.icon}
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              {feature.highlights.map((highlight, i) => (
                <View key={i} style={styles.featureHighlightRow}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.featureHighlight}>{highlight}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Platform Features */}
        <View style={styles.platformSection}>
          <Text style={styles.sectionTitle}>Built for modern campus life</Text>
          <Text style={styles.sectionSubtitle}>
            Every feature is designed to enhance your university experience
          </Text>
          
          {platformFeatures.map((feature, index) => (
            <View key={index} style={styles.platformCard}>
              <View style={styles.platformIcon}>
                {feature.icon}
              </View>
              <Text style={styles.platformTitle}>{feature.title}</Text>
              <Text style={styles.platformDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>
              Ready to transform your campus experience?
            </Text>
            <Text style={styles.ctaDescription}>
              Join thousands of students who are already connecting, discovering, and exploring with Yapp.
            </Text>
            <TouchableOpacity style={styles.ctaButton} onPress={handleJoinNow}>
              <View style={styles.ctaButtonContent}>
                <Text style={styles.ctaButtonText}>Join Now!</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signInLink} onPress={handleSignIn}>
              <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>Yapp</Text>
          <Text style={styles.footerText}>© 2024 Yapp. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInText: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  joinButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  badgeContainer: {
    marginBottom: 24,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    color: '#FB923C',
    fontSize: 16,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  titleWhite: {
    color: '#FFFFFF',
  },
  titleOrange: {
    color: '#FB923C',
  },
  typingContainer: {
    height: 40,
    justifyContent: 'center',
    marginBottom: 32,
  },
  typingText: {
    fontSize: 18,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  cursor: {
    opacity: 0.5,
  },
  heroDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  heroButtons: {
    alignItems: 'center',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifiedText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 64,
    lineHeight: 24,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureCardActive: {
    borderColor: 'rgba(251, 146, 60, 0.5)',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featureDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
    lineHeight: 24,
  },
  featureHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureHighlight: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  platformSection: {
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  platformCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  platformTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  platformDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  ctaCard: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  ctaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInLink: {
    paddingVertical: 8,
  },
  signInLinkText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 48,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});