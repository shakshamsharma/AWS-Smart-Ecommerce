const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const { AutoScalingClient, DescribeAutoScalingGroupsCommand } = require('@aws-sdk/client-auto-scaling');

const cwClient  = new CloudWatchClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const asgClient = new AutoScalingClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const ASG_NAME = process.env.ASG_NAME;

// GET /api/metrics/dashboard  (admin only)
exports.getDashboard = async (req, res, next) => {
  try {
    const endTime   = new Date();
    const startTime = new Date(endTime - 60 * 60 * 1000); // last hour

    const [asgData, cpuData, requestData] = await Promise.all([
      // Current instance count
      asgClient.send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [ASG_NAME] })),

      // CPU utilisation
      cwClient.send(new GetMetricStatisticsCommand({
        Namespace:  'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'AutoScalingGroupName', Value: ASG_NAME }],
        StartTime:  startTime,
        EndTime:    endTime,
        Period:     300,
        Statistics: ['Average'],
      })),

      // ALB request count
      cwClient.send(new GetMetricStatisticsCommand({
        Namespace:  'AWS/ApplicationELB',
        MetricName: 'RequestCount',
        Dimensions: [{ Name: 'LoadBalancer', Value: process.env.ALB_ARN_SUFFIX || '' }],
        StartTime:  startTime,
        EndTime:    endTime,
        Period:     300,
        Statistics: ['Sum'],
      })),
    ]);

    const asg = asgData.AutoScalingGroups[0];

    res.json({
      instances: {
        desired:  asg?.DesiredCapacity,
        min:      asg?.MinSize,
        max:      asg?.MaxSize,
        healthy:  asg?.Instances?.filter(i => i.HealthStatus === 'Healthy').length,
      },
      cpu: cpuData.Datapoints
        ?.sort((a, b) => a.Timestamp - b.Timestamp)
        ?.map(d => ({ time: d.Timestamp, value: Math.round(d.Average * 10) / 10 })),
      requests: requestData.Datapoints
        ?.sort((a, b) => a.Timestamp - b.Timestamp)
        ?.map(d => ({ time: d.Timestamp, value: Math.round(d.Sum) })),
    });

  } catch (err) {
    // Fall back gracefully in local dev (no AWS access)
    if (err.name === 'CredentialsProviderError') {
      return res.json({ error: 'AWS credentials not available in local environment' });
    }
    next(err);
  }
};
