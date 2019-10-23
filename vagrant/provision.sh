#!/usr/bin/env bash
sudo apt-get update

# install git
sudo apt-get install git -y

#install node js
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install nodejs -y

sudo npm install -g yarn
sudo npm install -g webpack
sudo npm install -g webpack-cli

# force startup folder to vagrant project
echo "cd /vagrant" >> /home/vagrant/.bashrc

# set hostname, makes console easier to identify
sudo echo "staticBlog" > /etc/hostname
sudo echo "127.0.0.1 staticBlog" >> /etc/hosts
