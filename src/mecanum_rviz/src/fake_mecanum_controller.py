#!/usr/bin/env python3

import rospy
import tf
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from math import sin, cos

x = 0.0
y = 0.0
th = 0.0

vx = 0.0
vy = 0.0
vth = 0.0


def cmd_callback(msg):
    global vx, vy, vth
    vx = msg.linear.x
    vy = msg.linear.y
    vth = msg.angular.z


rospy.init_node('fake_mecanum_controller')

rospy.Subscriber("/cmd_vel", Twist, cmd_callback)

odom_pub = rospy.Publisher("/odom", Odometry, queue_size=10)

br = tf.TransformBroadcaster()

rate = rospy.Rate(30)
last_time = rospy.Time.now()

while not rospy.is_shutdown():

    current_time = rospy.Time.now()
    dt = (current_time - last_time).to_sec()

    delta_x = (vx * cos(th) - vy * sin(th)) * dt
    delta_y = (vx * sin(th) + vy * cos(th)) * dt
    delta_th = vth * dt

    x += delta_x
    y += delta_y
    th += delta_th

    br.sendTransform(
        (x, y, 0),
        tf.transformations.quaternion_from_euler(0, 0, th),
        current_time,
        "base_link",
        "odom"
    )

    odom = Odometry()
    odom.header.stamp = current_time
    odom.header.frame_id = "odom"

    odom.pose.pose.position.x = x
    odom.pose.pose.position.y = y

    odom_pub.publish(odom)

    last_time = current_time
    rate.sleep()
