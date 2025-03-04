import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  lastCheckIn: bigint;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ lastCheckIn }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const nextCheckIn = Number(lastCheckIn) + 24 * 60 * 60;
      const difference = nextCheckIn - currentTime;

      if (difference <= 0) {
        setTimeLeft("Ready to check in!");
        return;
      }

      const hours = Math.floor(difference / 3600);
      const minutes = Math.floor((difference % 3600) / 60);
      const seconds = difference % 60;

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [lastCheckIn]);

  return (
    <div className="text-sm text-gray-300">
      Next check-in in: <span className="text-primary">{timeLeft}</span>
    </div>
  );
};

export default CountdownTimer;
