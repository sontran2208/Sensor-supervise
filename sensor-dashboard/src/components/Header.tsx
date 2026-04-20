import { useEdgeAI } from '../hooks/useEdgeAI'
import { HiChartBar, HiChip, HiLightningBolt, HiExclamationCircle } from 'react-icons/hi'
import { motion } from 'framer-motion'

type Page = "dashboard" | "ai" | "camera";

interface HeaderProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Header({ currentPage, onPageChange }: HeaderProps) {
  const isAIPage = currentPage === "ai";
  
  // Get AI system status
  const { systemStatus } = useEdgeAI();

  const getStatusDot = (isRunning: boolean, health: string) => {
    if (!isRunning) return '🔴'
    switch (health) {
      case 'healthy':
        return '🟢'
      case 'warning':
        return '🟡'
      case 'critical':
        return '🔴'
      default:
        return '⚪'
    }
  }

  return (
    <motion.div 
      className="mb-4 sm:mb-6 lg:mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 sm:mb-4 gap-3 sm:gap-4">
        <div className="flex-1 w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">
            Thống kê cảm biến
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            Theo dõi dữ liệu cảm biến real-time với AI
          </p>
          
          {/* AI Status Indicator */}
          {systemStatus && (
            <motion.div 
              className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                <HiLightningBolt className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-gray-700">AI:</span>
                <span className="text-xs sm:text-sm">
                  {getStatusDot(systemStatus.isRunning, systemStatus.systemHealth)}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-700">Sensors:</span>
                <span className="text-xs font-semibold text-blue-600">{systemStatus.sensorsConnected}</span>
              </div>
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full border shadow-sm ${
                systemStatus.activeAlerts > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
              }`}>
                <HiExclamationCircle className={`w-3 h-3 ${
                  systemStatus.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'
                }`} />
                <span className={`text-xs font-semibold ${
                  systemStatus.activeAlerts > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {systemStatus.activeAlerts}
                </span>
              </div>
            </motion.div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <motion.button
            onClick={() => onPageChange("dashboard")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] flex-1 sm:flex-initial outline-none focus:outline-none focus:ring-0 ${
              currentPage === "dashboard"
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md"
            }`}
          >
            <HiChartBar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Dashboard</span>
          </motion.button>
          <motion.button
            onClick={() => onPageChange("ai")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] flex-1 sm:flex-initial outline-none focus:outline-none focus:ring-0 ${
              isAIPage
                ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md"
            }`}
          >
            <HiChip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>AI</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
