import React from 'react';

interface DashboardCardProps {
  // FIX: Changed icon type from React.ReactNode to React.ReactElement for type safety with React.cloneElement.
  // FIX: The icon prop type was too generic for `React.cloneElement`. Making it more specific solves the type error.
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ icon, title, value }) => {
  return (
    <div className="p-5 bg-white rounded-xl shadow-md flex items-start space-x-4">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-light text-brand-primary">
          {/* FIX: Removed unnecessary type assertion as the prop type is now correct. */}
          {React.cloneElement(icon, { className: 'w-6 h-6' })}
        </div>
      </div>
      <div>
        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">{value}</dd>
      </div>
    </div>
  );
};

export default DashboardCard;