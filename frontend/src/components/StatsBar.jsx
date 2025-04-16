const StatsBar = ({ viewerCount, likeCount, diamondsCount }) => {
  return (
    <div className="flex justify-center items-center gap-2">
      <div className="flex flex-col items-center gap-2">
        <div className="flex justify-center items-center w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/30 shadow-md shadow-pink-500/10 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/20 group">
          <span className="text-3xl group-hover:-rotate-12 transition-transform duration-300">👁️</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Viewers</span>
          <span className="text-xl font-bold text-white">{viewerCount}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex justify-center items-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 shadow-md shadow-red-500/10 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 group">
          <span className="text-3xl group-hover:scale-125 transition-transform duration-300">❤️</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Likes</span>
          <span className="text-xl font-bold text-white">{likeCount}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex justify-center items-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 shadow-md shadow-blue-500/10 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 group">
          <span className="text-3xl group-hover:rotate-12 transition-transform duration-300">💎</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Diamonds</span>
          <span className="text-xl font-bold text-white">{diamondsCount}</span>
        </div>
      </div>
    </div>
  )
}

export default StatsBar 